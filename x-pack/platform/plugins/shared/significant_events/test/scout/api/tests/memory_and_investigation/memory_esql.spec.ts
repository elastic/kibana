/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { v4 as uuidv4 } from 'uuid';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const MEMORY_DATA_STREAM = 'ai-nightshift-memory';

apiTest.describe(
  'Memory ES|QL retrieval',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const pages = [
      {
        name: `scout-memory-esql-a-${uuidv4().slice(0, 8)}`,
        title: 'Scout memory ES|QL page A',
      },
      {
        name: `scout-memory-esql-b-${uuidv4().slice(0, 8)}`,
        title: 'Scout memory ES|QL page B',
      },
    ];
    const entryIds: string[] = [];

    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.significantEventsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

      for (const entryId of entryIds) {
        await apiClient.delete(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
      }
      await apiServices.significantEventsTest.disableMemory();
    });

    apiTest(
      'retrieves memory pages directly from the visible data stream',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        for (const page of pages) {
          const response = await apiClient.post('internal/streams/memory/entries', {
            headers,
            body: {
              ...page,
              content: `Content for ${page.name}`,
              tags: ['scout', 'esql'],
            },
            responseType: 'json',
          });
          expect(response.statusCode).toBe(200);
          entryIds.push(response.body.id as string);
        }

        const { columns, values } = await esClient.esql.query({
          query: `FROM ${MEMORY_DATA_STREAM} | WHERE type == "memory" | KEEP id, name, title, version`,
        });
        const nameColumn = columns.findIndex(({ name }) => name === 'name');
        const titleColumn = columns.findIndex(({ name }) => name === 'title');
        const returnedPages = new Map(
          values.map((row) => [row[nameColumn] as string, row[titleColumn] as string])
        );

        expect(returnedPages.get(pages[0].name)).toBe(pages[0].title);
        expect(returnedPages.get(pages[1].name)).toBe(pages[1].title);

        const { data_streams: dataStreams } = await esClient.indices.getDataStream({
          name: MEMORY_DATA_STREAM,
        });
        expect(dataStreams).toHaveLength(1);
        expect(dataStreams[0].hidden).toBe(false);
      }
    );
  }
);
