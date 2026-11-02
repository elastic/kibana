/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  SESSION_EVENTS_SAVE_PATH,
  SESSION_MEMORY_INTERNAL_API_VERSION,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../../common/constants';
import {
  listSessionEvents,
  listSessionMemory,
  rememberSessionMemory,
  saveSessionEvent,
  searchSessionMemory,
} from './session_memory';

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
  it('GETs the session path with only the provided scope filters', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ count: 0, results: [] });

    await listSessionMemory(http, { sessionId: 'session/one', space: 'default', size: 10 });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/session_memory/session%2Fone', {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      query: { space: 'default', size: 10 },
    });
  });
});

describe('saveSessionEvent', () => {
  it('POSTs the event body to the versioned save endpoint', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ id: 'e-1' });
    const body = { ...scope, transcript: 'user: hi' };

    await saveSessionEvent(http, { body });

    expect(http.post).toHaveBeenCalledWith(SESSION_EVENTS_SAVE_PATH, {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      body: JSON.stringify(body),
    });
  });
});

describe('listSessionEvents', () => {
  it('GETs the session events path with the scope filters and abort signal', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ count: 0, results: [] });
    const signal = new AbortController().signal;

    await listSessionEvents(http, { sessionId: 's-1', ai_index_id: 'idx', signal });

    expect(http.get).toHaveBeenCalledWith('/internal/context_engine/session_events/s-1', {
      version: SESSION_MEMORY_INTERNAL_API_VERSION,
      query: { ai_index_id: 'idx' },
      signal,
    });
  });
});
