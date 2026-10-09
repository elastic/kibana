/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  AI_INDEX_KI_BY_ID_PATH,
  AI_INDEX_KI_LIST_PATH,
} from '../../../common/constants';
import { KI_LIFECYCLE_STATUSES } from '../../../common/step_types/ki';
import type { GetKiResponse, ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { getKi, listKis } from './knowledge_indicators';

const emptyListKisResponse: ListKisResponse = {
  kis: [],
  total: 0,
  summary: { total: 0, counts_by_type: [] },
};

describe('listKis', () => {
  const createHttp = () => coreMock.createStart().http;

  it('requests the versioned list endpoint for the AI index', async () => {
    const http = createHttp();
    const response = emptyListKisResponse;
    http.get.mockResolvedValue(response);

    const result = await listKis(http, { aiIndexId: 'support' });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: {},
    });
    expect(result).toBe(response);
  });

  it('passes size, type, and lifecycle_status when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue(emptyListKisResponse);

    await listKis(http, {
      aiIndexId: 'support',
      size: 50,
      type: 'playbook',
      lifecycleStatus: [...KI_LIFECYCLE_STATUSES],
    });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: {
        size: 50,
        type: 'playbook',
        lifecycle_status: ['active', 'deleted'],
      },
    });
  });

  it('omits optional query keys when not provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue(emptyListKisResponse);

    await listKis(http, { aiIndexId: 'support', size: 10 });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: { size: 10 },
    });
  });

  it('forwards the abort signal when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue(emptyListKisResponse);
    const signal = new AbortController().signal;

    await listKis(http, { aiIndexId: 'support', signal });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: {},
      signal,
    });
  });

  it('uses buildPath placeholders from constants', async () => {
    const http = createHttp();
    http.get.mockResolvedValue(emptyListKisResponse);

    await listKis(http, { aiIndexId: 'my-index' });

    expect(AI_INDEX_KI_LIST_PATH).toContain('{aiIndexId}');
    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/kis',
      expect.any(Object)
    );
  });
});

describe('getKi', () => {
  const createHttp = () => coreMock.createStart().http;

  it('requests the versioned item endpoint with the backing index', async () => {
    const http = createHttp();
    const response: GetKiResponse = {
      id: 'ki-1',
      document: { type: 'playbook', title: 'Example' },
    };
    http.get.mockResolvedValue(response);

    const result = await getKi(http, {
      aiIndexId: 'support',
      kiId: 'ki-1',
      index: 'ai-index-idx-support',
    });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis/ki-1', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: { index: 'ai-index-idx-support' },
    });
    expect(result).toBe(response);
  });

  it('passes lifecycle_status when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ id: 'ki-1', document: {} });

    await getKi(http, {
      aiIndexId: 'support',
      kiId: 'ki-1',
      index: 'ai-index-idx-support',
      lifecycleStatus: ['active'],
    });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis/ki-1', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: {
        index: 'ai-index-idx-support',
        lifecycle_status: ['active'],
      },
    });
  });

  it('forwards the abort signal when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ id: 'ki-1', document: {} });
    const signal = new AbortController().signal;

    await getKi(http, {
      aiIndexId: 'support',
      kiId: 'ki-1',
      index: 'ai-index-idx-support',
      signal,
    });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/ai_index/support/kis/ki-1', {
      version: AI_INDEX_INTERNAL_API_VERSION,
      query: { index: 'ai-index-idx-support' },
      signal,
    });
  });

  it('uses buildPath placeholders from constants', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ id: 'ki-2', document: {} });

    await getKi(http, {
      aiIndexId: 'support',
      kiId: 'ki-2',
      index: 'ai-index-idx-support',
    });

    expect(AI_INDEX_KI_BY_ID_PATH).toContain('{kiId}');
    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/support/kis/ki-2',
      expect.any(Object)
    );
  });
});
