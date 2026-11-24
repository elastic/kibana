/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../../common/fixtures/constants';
import {
  assertEntitiesEqual,
  expectedHostEntities,
  expectedUserEntities,
} from '../../../common/fixtures/entity_extraction_expected';
import {
  clearInstalledEntityStoreDocuments,
  setupLogsTestDataStream,
  teardownLogsTestDataStream,
  type ApiClientFixture,
} from '../../../common/fixtures/helpers';
import {
  LOG_EXTRACTION_DOCS_LIMIT_DEFAULT,
  LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
} from '../../../../../server/domain/saved_objects';

apiTest.describe(
  'Entity Store Logs Extraction with pagination (entity pages + maxLogsPerPage)',
  { tag: ENTITY_STORE_TAGS },
  () => {
    const DOCS_LIMIT = 5;

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    const setDocsLimit = async (apiClient: ApiClientFixture, docsLimit: number) => {
      const response = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { docsLimit } },
      });
      expect(response.statusCode).toBe(200);
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient, esArchiver }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };
      internalHeaders = {
        ...credentials.cookieHeader,
        ...INTERNAL_HEADERS,
      };
      await clearInstalledEntityStoreDocuments(esClient);

      await setupLogsTestDataStream(esClient);
      await esArchiver.loadIfNeeded(
        'x-pack/platform/plugins/shared/entity_store/test/scout/common/es_archives/logs'
      );

      await setDocsLimit(apiClient, DOCS_LIMIT);
    });

    // Every test starts from an empty latest index, so none depends on what an earlier test or a
    // failed attempt left behind.
    apiTest.beforeEach(async ({ esClient }) => {
      await clearInstalledEntityStoreDocuments(esClient);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      try {
        const resetResponse = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            logExtraction: {
              docsLimit: LOG_EXTRACTION_DOCS_LIMIT_DEFAULT,
              maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
            },
          },
        });
        expect(resetResponse.statusCode).toBe(200);
      } finally {
        await teardownLogsTestDataStream(esClient);
      }
    });

    apiTest('Should extract host with entity pagination', async ({ apiClient, esClient, log }) => {
      const expectedPageCount = Math.ceil(expectedHostEntities.length / DOCS_LIMIT);

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {
            fromDateISO: '2026-01-20T11:00:00Z',
            toDateISO: '2026-01-20T13:00:00Z',
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body.success).toBe(true);
      expect(extractionResponse.body.count).toBe(expectedHostEntities.length);
      expect(extractionResponse.body.pages).toBe(expectedPageCount);

      const entities = await esClient.search({
        index: LATEST_ALIAS,
        query: {
          bool: {
            filter: {
              term: { 'entity.EngineMetadata.Type': 'host' },
            },
          },
        },
        size: 1000, // a lot just to be sure we are not capping it
      });

      assertEntitiesEqual(expectedHostEntities, entities.hits.hits, (msg) => log.error(msg));
    });

    apiTest(
      'Should extract user entities across entity pages in both extraction modes, through the postAggFilter path',
      async ({ apiClient, esClient, log }) => {
        // Each mode pages with its own limit. `priority` owns most of the users, so a page of
        // DOCS_LIMIT holds several rows and a short page ends the loop. `nonPriority` only owns a
        // couple of users in this archive: with a larger page it would finish in a single page and
        // never apply its cursor, so it pages one entity at a time.
        const limitByProcess = [
          { process: 'priority', docsLimit: DOCS_LIMIT },
          { process: 'nonPriority', docsLimit: 1 },
        ] as const;

        try {
          for (const { process, docsLimit } of limitByProcess) {
            await setDocsLimit(apiClient, docsLimit);
            const extractionResponse = await apiClient.post(
              ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('user'),
              {
                headers: internalHeaders,
                responseType: 'json',
                body: {
                  fromDateISO: '2026-01-20T11:00:00Z',
                  toDateISO: '2026-01-20T13:00:00Z',
                  process,
                },
              }
            );
            expect(extractionResponse.statusCode).toBe(200);
            expect(extractionResponse.body.success).toBe(true);
            const { count, pages } = extractionResponse.body;
            expect(count, `${process} extracted no users`).toBeGreaterThan(0);
            expect(pages, `${process} did not page`).toBe(Math.ceil(count / docsLimit));
            expect(pages, `${process} stayed on a single page`).toBeGreaterThan(1);
          }
        } finally {
          await setDocsLimit(apiClient, DOCS_LIMIT);
        }

        const entities = await esClient.search({
          index: LATEST_ALIAS,
          query: {
            bool: {
              filter: {
                term: { 'entity.EngineMetadata.Type': 'user' },
              },
            },
          },
          size: 1000, // a lot just to be sure we are not capping it
        });

        assertEntitiesEqual(expectedUserEntities, entities.hits.hits, (msg) => log.error(msg));
      }
    );

    apiTest(
      'Should run more ESQL pages when maxLogsPerPage narrows log slices',
      async ({ apiClient, esClient, log }) => {
        const minimumPagesWithEntityPaginationOnly = 4;

        const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { logExtraction: { maxLogsPerPage: 2 } },
        });
        expect(update.statusCode).toBe(200);

        const extractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: {
              fromDateISO: '2026-01-20T11:00:00Z',
              toDateISO: '2026-01-20T13:00:00Z',
            },
          }
        );
        expect(extractionResponse.statusCode).toBe(200);
        expect(extractionResponse.body.success).toBe(true);
        // We process some entities twice because they didn't fall in the same logs page
        expect(extractionResponse.body.count).toBeGreaterThan(expectedHostEntities.length);
        expect(extractionResponse.body.pages).toBeGreaterThan(minimumPagesWithEntityPaginationOnly);

        const entities = await esClient.search({
          index: LATEST_ALIAS,
          query: {
            bool: {
              filter: {
                term: { 'entity.EngineMetadata.Type': 'host' },
              },
            },
          },
          sort: '@timestamp:asc,entity.id:asc',
          size: 1000,
        });

        assertEntitiesEqual(expectedHostEntities, entities.hits.hits, (msg) => log.error(msg));
      }
    );
  }
);
