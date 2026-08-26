/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { AI_INDEX_API_VERSION, aiIndexPath } from '../../../common/constants';
import type { AiIndexProperties, ListAiIndexResponse } from '../../../common/http_api/ai_indices';
import { createAiIndex, listAiIndices, putAiIndex } from './ai_indices';

const properties: AiIndexProperties = {
  dest: { type: 'index', value: 'ai-index-idx-support' },
  automations: [],
  sources: [],
};

describe('listAiIndices', () => {
  const createHttp = () => coreMock.createStart().http;

  it('requests the versioned list endpoint and returns the response', async () => {
    const http = createHttp();
    const response: ListAiIndexResponse = { ai_indices: [] };
    http.get.mockResolvedValue(response);

    const result = await listAiIndices(http);

    expect(http.get).toHaveBeenCalledWith(aiIndexPath, { version: AI_INDEX_API_VERSION });
    expect(result).toBe(response);
  });

  it('forwards the abort signal when provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ ai_indices: [] });
    const signal = new AbortController().signal;

    await listAiIndices(http, { signal });

    expect(http.get).toHaveBeenCalledWith(aiIndexPath, {
      version: AI_INDEX_API_VERSION,
      signal,
    });
  });

  it('does not include a signal key when none is provided', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ ai_indices: [] });

    await listAiIndices(http);

    expect(http.get).toHaveBeenCalledWith(aiIndexPath, { version: AI_INDEX_API_VERSION });
  });
});

describe('createAiIndex', () => {
  it('posts to the collection endpoint with the id in the body', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({});

    await createAiIndex(http, { aiIndexId: 'support', properties });

    expect(http.post).toHaveBeenCalledWith(aiIndexPath, {
      version: AI_INDEX_API_VERSION,
      body: JSON.stringify({ id: 'support', ...properties }),
    });
  });
});

describe('putAiIndex', () => {
  it('puts to the item endpoint with only the writable properties', async () => {
    const http = coreMock.createStart().http;
    http.put.mockResolvedValue({});

    await putAiIndex(http, { aiIndexId: 'support', properties });

    expect(http.put).toHaveBeenCalledWith('/api/context_engine/ai_index/support', {
      version: AI_INDEX_API_VERSION,
      body: JSON.stringify(properties),
    });
  });
});
