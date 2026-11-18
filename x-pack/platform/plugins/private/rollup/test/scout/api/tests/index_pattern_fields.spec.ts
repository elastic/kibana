/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DataViewType } from '@kbn/data-views-plugin/common';
import { FIELDS_FOR_WILDCARD_PATH } from '@kbn/data-views-plugin/common/constants';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ROLLUP_ADMIN_ROLE, SOURCE_INDEX_PREFIX } from '../fixtures/constants';
import {
  cleanupRollupState,
  createMockRollupUsage,
  createSourceIndex,
  getJobPayload,
  rollupApi,
  seedRollupTargetDoc,
  uniqueJobId,
  uniqueTargetIndex,
} from '../fixtures/rollup_jobs';

apiTest.describe(
  'Data view fields for a rollup index',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    let headers: Record<string, string>;

    const getFieldsForWildcard = (apiClient: ApiClientFixture, query: string) =>
      apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}${query}`, { headers, responseType: 'json' });

    apiTest.beforeAll(async ({ requestAuth }) => {
      // `fields_for_wildcard` is an internal route, so it needs the internal-origin header (in
      // COMMON_HEADERS) plus the internal API version. Auth is an API key rather than the usual
      // cookie session for internal routes: this suite runs on Cloud (@cloud-stateful-classic),
      // and samlAuth custom roles require predefined Cloud users that don't exist there, whereas a
      // custom-role API key works both locally and on ECH.
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(ROLLUP_ADMIN_ROLE);
      headers = {
        ...COMMON_HEADERS,
        ...apiKeyHeader,
        [ELASTIC_HTTP_VERSION_HEADER]: INITIAL_REST_VERSION_INTERNAL,
      };
    });

    // Defensive sweep in case an interrupted run left rollup jobs or indices behind.
    apiTest.beforeEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest('requires a pattern query param', async ({ apiClient }) => {
      const response = await getFieldsForWildcard(apiClient, '');

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain(
        '[request query.pattern]: expected value of type [string]'
      );
    });

    apiTest('returns 404 when the rollup index does not exist', async ({ apiClient }) => {
      const missingPattern = `${SOURCE_INDEX_PREFIX}-missing`;
      const response = await getFieldsForWildcard(
        apiClient,
        `?pattern=${missingPattern}&type=${DataViewType.ROLLUP}&rollup_index=${uniqueTargetIndex(
          'fields-missing'
        )}`
      );

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toContain(`No indices match "${missingPattern}"`);
    });

    apiTest('returns the rolled-up fields of a matching index', async ({ apiClient, esClient }) => {
      // Since 8.15 ES only allows creating a rollup job when the cluster already has rollup
      // usage, which the mock index simulates.
      await createMockRollupUsage(esClient, 'fields');
      const indexName = await createSourceIndex(esClient, 'fields');
      const targetIndex = uniqueTargetIndex('fields');
      const jobId = uniqueJobId('fields');
      await rollupApi(apiClient, headers).createJob(getJobPayload(indexName, jobId, targetIndex));
      // The route reads the pattern's field caps, which only cover the rollup fields once the
      // target index holds rolled-up data.
      await seedRollupTargetDoc(esClient, targetIndex, jobId);

      // `type=rollup` routes into the rollup-capabilities branch of `IndexPatternsFetcher`, and the
      // pattern is the rollup index itself — matching how a rollup data view queries this route.
      const response = await getFieldsForWildcard(
        apiClient,
        `?pattern=${targetIndex}&type=${DataViewType.ROLLUP}&rollup_index=${targetIndex}`
      );

      expect(response).toHaveStatusCode(200);
      const fields: Array<{ name: string }> = response.body.fields;
      expect(fields.map(({ name }) => name).sort()).toStrictEqual([
        'testCreatedField',
        'testTagField',
        'testTotalField',
      ]);
    });
  }
);
