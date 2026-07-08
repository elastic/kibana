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
      await apiServices.significantEventsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.significantEventsTest.disableMemory();
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

    // Writes use `refresh: 'wait_for'`, so a page is searchable immediately after the
    // write resolves. These assertions intentionally do NOT poll — if the write did not
    // wait for refresh, the reads below would race and fail.
    apiTest(
      'a freshly written page is immediately readable without polling',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        const pageName = `scout-refresh-${uuidv4().slice(0, 8)}`;
        const category = 'scout/refresh';
        const title = 'Refresh smoke test';
        const content = 'Content that must be visible immediately';

        const createResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: { name: pageName, title, content, categories: [category], tags: ['scout'] },
          responseType: 'json',
        });
        expect(createResponse.statusCode).toBe(200);
        const entryId = createResponse.body.id as string;
        expect(entryId).toBeDefined();

        // get by id — immediate, no poll
        const getById = await apiClient.get(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
        expect(getById.statusCode).toBe(200);
        expect(getById.body.id).toBe(entryId);
        expect(getById.body.title).toBe(title);

        // get by name — immediate, no poll
        const getByName = await apiClient.get(
          `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
          { headers, responseType: 'json' }
        );
        expect(getByName.statusCode).toBe(200);
        expect(getByName.body.id).toBe(entryId);

        // search — immediate, no poll
        const searchResponse = await apiClient.post('internal/streams/memory/search', {
          headers,
          body: { query: pageName },
          responseType: 'json',
        });
        expect(
          searchResponse.body.results.some((result: { id: string }) => result.id === entryId)
        ).toBe(true);

        // category tree — immediate, no poll
        const treeResponse = await apiClient.get('internal/streams/memory/categories', {
          headers,
          responseType: 'json',
        });
        expect(findPageInTree(treeResponse.body.tree, pageName)).toBe(true);

        // an update is also immediately visible
        const updatedContent = 'Updated content, also immediately visible';
        const updateResponse = await apiClient.put(`internal/streams/memory/entries/${entryId}`, {
          headers,
          body: { content: updatedContent, change_summary: 'refresh test update' },
          responseType: 'json',
        });
        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body.version).toBe(2);

        const afterUpdate = await apiClient.get(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
        expect(afterUpdate.body.version).toBe(2);
        expect(afterUpdate.body.content).toBe(updatedContent);

        // cleanup — delete is immediately reflected too
        const deleteResponse = await apiClient.delete(
          `internal/streams/memory/entries/${entryId}`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse.statusCode).toBe(200);

        const afterDelete = await apiClient.get(
          `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
          { headers, responseType: 'json' }
        );
        expect(afterDelete.statusCode).toBe(404);
      }
    );

    // The pages data stream is append-only: an update writes a new, higher-versioned
    // document rather than mutating the old one. Reads must resolve the *latest* version,
    // so a category removed in the latest version must not resurface a stale older version.
    apiTest(
      'removing a category does not return the stale older version',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        const pageName = `scout-stale-${uuidv4().slice(0, 8)}`;
        const category = `scout/stale-${uuidv4().slice(0, 8)}`;
        const originalContent = 'Original content with category';

        const createResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: {
            name: pageName,
            title: 'Stale test',
            content: originalContent,
            categories: [category],
            tags: ['scout'],
          },
          responseType: 'json',
        });
        expect(createResponse.statusCode).toBe(200);
        const entryId = createResponse.body.id as string;

        // The page is initially listed under its category.
        const treeBefore = await apiClient.get('internal/streams/memory/categories', {
          headers,
          responseType: 'json',
        });
        expect(findPageInTree(treeBefore.body.tree, pageName)).toBe(true);

        // Update to a new version that removes the category (and changes the content).
        const updatedContent = 'Updated content without category';
        const updateResponse = await apiClient.put(`internal/streams/memory/entries/${entryId}`, {
          headers,
          body: {
            categories: [],
            content: updatedContent,
            change_summary: 'remove category',
          },
          responseType: 'json',
        });
        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body.version).toBe(2);

        // The latest version reflects the removal — no stale category, no stale content.
        const getByName = await apiClient.get(
          `internal/streams/memory/entries/by-name?name=${encodeURIComponent(pageName)}`,
          { headers, responseType: 'json' }
        );
        expect(getByName.statusCode).toBe(200);
        expect(getByName.body.version).toBe(2);
        expect(getByName.body.categories).toHaveLength(0);
        expect(getByName.body.content).toBe(updatedContent);

        // The page must no longer appear under the removed category in the browse tree,
        // even though an older (v1) document still carries it in the append-only stream.
        const treeAfter = await apiClient.get('internal/streams/memory/categories', {
          headers,
          responseType: 'json',
        });
        expect(findPageInTree(treeAfter.body.tree, pageName)).toBe(false);

        // cleanup
        await apiClient.delete(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
      }
    );

    // Search must evaluate filters against each page's LATEST version only. A category present on an
    // older (now stale) version in the append-only stream must not make the page resurface once the
    // latest version has dropped it.
    apiTest(
      'search does not return a page whose latest version no longer matches the filter',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        const pageName = `scout-search-filter-${uuidv4().slice(0, 8)}`;
        const category = `scout/search-filter-${uuidv4().slice(0, 8)}`;
        const token = `scoutsearch${uuidv4().replace(/-/g, '').slice(0, 12)}`;

        const createResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: {
            name: pageName,
            title: 'Search filter test',
            content: `Searchable content ${token}`,
            categories: [category],
            tags: ['scout'],
          },
          responseType: 'json',
        });
        expect(createResponse.statusCode).toBe(200);
        const entryId = createResponse.body.id as string;

        // The latest version still has the category — it is returned.
        const beforeResponse = await apiClient.post('internal/streams/memory/search', {
          headers,
          body: { query: token, categories: [category] },
          responseType: 'json',
        });
        expect(
          beforeResponse.body.results.some((result: { id: string }) => result.id === entryId)
        ).toBe(true);

        // A newer version drops the category; an older (v1) document still carries it in the stream.
        const updateResponse = await apiClient.put(`internal/streams/memory/entries/${entryId}`, {
          headers,
          body: { categories: [], change_summary: 'remove category' },
          responseType: 'json',
        });
        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body.version).toBe(2);

        // The match is evaluated against the latest version only, so the page no longer surfaces.
        const afterResponse = await apiClient.post('internal/streams/memory/search', {
          headers,
          body: { query: token, categories: [category] },
          responseType: 'json',
        });
        expect(
          afterResponse.body.results.some((result: { id: string }) => result.id === entryId)
        ).toBe(false);

        // cleanup
        await apiClient.delete(`internal/streams/memory/entries/${entryId}`, {
          headers,
          responseType: 'json',
        });
      }
    );

    // A soft-delete writes a tombstone that retains the page's fields, so the tombstone can still
    // match a structured filter. A deleted page must never appear in search results regardless.
    apiTest(
      'search does not return a soft-deleted page even if its latest version matches the filter',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        const pageName = `scout-search-deleted-${uuidv4().slice(0, 8)}`;
        const category = `scout/search-deleted-${uuidv4().slice(0, 8)}`;
        const token = `scoutsearch${uuidv4().replace(/-/g, '').slice(0, 12)}`;

        const createResponse = await apiClient.post('internal/streams/memory/entries', {
          headers,
          body: {
            name: pageName,
            title: 'Search deleted test',
            content: `Searchable content ${token}`,
            categories: [category],
            tags: ['scout'],
          },
          responseType: 'json',
        });
        expect(createResponse.statusCode).toBe(200);
        const entryId = createResponse.body.id as string;

        const deleteResponse = await apiClient.delete(
          `internal/streams/memory/entries/${entryId}`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse.statusCode).toBe(200);
        expect(deleteResponse.body.deleted).toBe(true);

        // The tombstone retains the category, but a deleted page must never appear in search.
        const searchResponse = await apiClient.post('internal/streams/memory/search', {
          headers,
          body: { query: token, categories: [category] },
          responseType: 'json',
        });
        expect(
          searchResponse.body.results.some((result: { id: string }) => result.id === entryId)
        ).toBe(false);
      }
    );
  }
);
