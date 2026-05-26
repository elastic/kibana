/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { v4 as uuidv4 } from 'uuid';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

interface MemoryCategoryNode {
  name: string;
  category: string;
  pages: Array<{ id: string; name: string; title: string }>;
  children: MemoryCategoryNode[];
}

const findPageInTree = (tree: MemoryCategoryNode[], pageName: string): boolean => {
  for (const node of tree) {
    if (node.pages.some((page) => page.name === pageName)) {
      return true;
    }
    if (findPageInTree(node.children, pageName)) {
      return true;
    }
  }
  return false;
};

apiTest.describe(
  'Memory CRUD API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.streamsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.streamsTest.disableMemory();
    });

    apiTest(
      'smoke: create, read, search, categories, soft-delete, and restore by name',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        const pageName = `scout-memory-${uuidv4().slice(0, 8)}`;
        const category = 'scout/integration';
        const title = 'Scout memory smoke test';
        const content = 'Integration smoke content for memory API';

        const createResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: {
            name: pageName,
            title,
            content,
            categories: [category],
            tags: ['scout', 'smoke'],
          },
          responseType: 'json',
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body.id).toBeDefined();
        expect(createResponse.body.name).toBe(pageName);
        expect(createResponse.body.version).toBe(1);

        const entryId = createResponse.body.id as string;

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(`internal/streams/memory/entries/${entryId}`, {
                headers,
                responseType: 'json',
              });
              return response.statusCode;
            },
            { timeout: 15_000 }
          )
          .toBe(200);

        const getByIdResponse = await apiClient.get(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
        expect(getByIdResponse.body.id).toBe(entryId);
        expect(getByIdResponse.body.title).toBe(title);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(
                `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
                { headers, responseType: 'json' }
              );
              return response.statusCode;
            },
            { timeout: 15_000 }
          )
          .toBe(200);

        const getByNameResponse = await apiClient.get(
          `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
          { headers, responseType: 'json' }
        );
        expect(getByNameResponse.body.id).toBe(entryId);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get('internal/streams/memory/categories', {
                headers,
                responseType: 'json',
              });
              return findPageInTree(response.body.tree, pageName);
            },
            { timeout: 15_000 }
          )
          .toBe(true);

        await expect
          .poll(
            async () => {
              const response = await apiClient.post('internal/streams/memory/search', {
                headers,
                body: { query: pageName },
                responseType: 'json',
              });
              return response.body.results.some((result: { id: string }) => result.id === entryId);
            },
            { timeout: 15_000 }
          )
          .toBe(true);

        const deleteResponse = await apiClient.delete(
          `internal/streams/memory/entries/${entryId}`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse.statusCode).toBe(200);
        expect(deleteResponse.body.deleted).toBe(true);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(
                `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
                { headers, responseType: 'json' }
              );
              return response.statusCode;
            },
            { timeout: 15_000 }
          )
          .toBe(404);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get('internal/streams/memory/categories', {
                headers,
                responseType: 'json',
              });
              return findPageInTree(response.body.tree, pageName);
            },
            { timeout: 15_000 }
          )
          .toBe(false);

        const restoreResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: {
            name: pageName,
            title: `${title} (restored)`,
            content: `${content} — restored`,
            categories: [category],
            tags: ['scout', 'smoke', 'restored'],
          },
          responseType: 'json',
        });
        expect(restoreResponse.statusCode).toBe(200);
        expect(restoreResponse.body.id).toBe(entryId);
        expect(restoreResponse.body.version).toBe(3);
        expect(restoreResponse.body.is_deleted).not.toBe(true);

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(
                `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
                { headers, responseType: 'json' }
              );
              return response.statusCode === 200 && response.body.version === 3
                ? response.body.title
                : null;
            },
            { timeout: 15_000 }
          )
          .toBe(`${title} (restored)`);

        // Cleanup tombstone chain so repeated runs stay predictable
        await apiClient.delete(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
      }
    );
  }
);
