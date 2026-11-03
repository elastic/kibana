/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  SESSION_MEMORY_INTERNAL_API_VERSION,
  SESSION_MEMORY_LIST_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../../common/constants';
import { listSessionMemory, rememberSessionMemory, searchSessionMemory } from './session_memory';

const scope = { session_id: 's-1', user_id: 'u-1', agent_id: 'a-1' };

describe('rememberSessionMemory', () => {
  it('POSTs the memory body to the versioned remember endpoint', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ id: 'm-1' });
    const body = { ...scope, content: 'Prefers dark mode' };

    await rememberSessionMemory(http, { body });

    expect(http.post).toHaveBeenCalledWith(SESSION_MEMORY_REMEMBER_PATH, {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      body: JSON.stringify(body),
    });
  });
});

describe('searchSessionMemory', () => {
  it('POSTs the query and filters and forwards the abort signal', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ count: 0, results: [] });
    const signal = new AbortController().signal;
    const body = { query: { type: 'image' as const, value: 'data:image/png;base64,AA' }, size: 5 };

    await searchSessionMemory(http, { body, signal });

    expect(http.post).toHaveBeenCalledWith(SESSION_MEMORY_SEARCH_PATH, {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      body: JSON.stringify(body),
      signal,
    });
  });
});

describe('listSessionMemory', () => {
  it('GETs the list path with only the provided filters', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ count: 0, results: [] });

    await listSessionMemory(http, {
      user_id: 'u-1',
      space: 'default',
      ai_index_id: undefined,
      size: 10,
    });

    expect(http.get).toHaveBeenCalledWith(SESSION_MEMORY_LIST_PATH, {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      query: { user_id: 'u-1', space: 'default', size: 10 },
    });
  });
});
