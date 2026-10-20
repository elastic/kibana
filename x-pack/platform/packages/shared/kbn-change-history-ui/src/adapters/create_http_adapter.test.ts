/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChangeHistoryHttpAdapter } from './create_http_adapter';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';

describe('createChangeHistoryHttpAdapter', () => {
  it('fetches and maps list changes with 0-based pagination by default', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({
        items: [{ id: 'evt-1', timestamp: '2026-01-01T00:00:00Z' }],
        total: 1,
      }),
    };

    const mapListItem = jest.fn((dto: unknown) => dto as ChangeHistoryListItem);

    const adapter = createChangeHistoryHttpAdapter({
      http,
      listPath: '/api/example/{objectId}/history',
      mapListItem,
    });

    const result = await adapter.listChanges({
      objectId: 'entity-1',
      page: { index: 0, size: 20 },
    });

    expect(http.get).toHaveBeenCalledWith('/api/example/entity-1/history', {
      query: { page: 0, per_page: 20 },
      signal: undefined,
    });
    expect(mapListItem).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
  });

  it('translates page index when pageIndexBase is 1', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const adapter = createChangeHistoryHttpAdapter({
      http,
      listPath: '/api/example/{objectId}/history',
      pageIndexBase: 1,
    });

    await adapter.listChanges({
      objectId: 'entity-1',
      page: { index: 2, size: 10 },
    });

    expect(http.get).toHaveBeenCalledWith('/api/example/entity-1/history', {
      query: { page: 3, per_page: 10 },
      signal: undefined,
    });
  });

  it('maps HTTP errors on listChanges', async () => {
    const http = {
      get: jest.fn().mockRejectedValue({
        response: { status: 403 },
        body: { message: 'Forbidden' },
        message: 'Forbidden',
      }),
    };

    const mapHttpError = jest.fn((error: unknown) => new Error(`mapped: ${String(error)}`));

    const adapter = createChangeHistoryHttpAdapter({
      http,
      listPath: '/api/example/{objectId}/history',
      mapHttpError,
    });

    await expect(
      adapter.listChanges({
        objectId: 'entity-1',
        page: { index: 0, size: 20 },
      })
    ).rejects.toThrow('mapped:');

    expect(mapHttpError).toHaveBeenCalledTimes(1);
  });

  it('getChange requires detailPath', async () => {
    const adapter = createChangeHistoryHttpAdapter({
      http: { get: jest.fn() },
      listPath: '/api/history/{objectId}',
    });

    await expect(
      adapter.getChange({
        objectId: 'entity-1',
        changeId: 'evt-1',
      })
    ).rejects.toThrow('detailPath is required');
  });

  it('restoreChange posts to restorePath when configured', async () => {
    const http = {
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(undefined),
    };

    const adapter = createChangeHistoryHttpAdapter({
      http,
      listPath: '/api/example/{objectId}/history',
      restorePath: '/api/example/{objectId}/history/{eventId}/restore',
    });

    await adapter.restoreChange!({
      objectId: 'entity-1',
      changeId: 'evt-1',
    });

    expect(http.post).toHaveBeenCalledWith('/api/example/entity-1/history/evt-1/restore', {
      signal: undefined,
    });
  });

  it('restoreChange requires http.post', async () => {
    const adapter = createChangeHistoryHttpAdapter({
      http: { get: jest.fn() },
      listPath: '/api/history/{objectId}',
      restorePath: '/api/history/{objectId}/{eventId}/restore',
    });

    await expect(
      adapter.restoreChange!({
        objectId: 'entity-1',
        changeId: 'evt-1',
      })
    ).rejects.toThrow('http.post is required');
  });
});
