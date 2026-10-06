/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { getWritableMemoryAiIndex } from './get_writable_memory_ai_index';

describe('getWritableMemoryAiIndex', () => {
  const request = httpServerMock.createKibanaRequest();
  const get = jest.fn();
  const globalSettingsGet = jest.fn();
  const coreStart = coreMock.createStart();
  const aiIndex = {
    id: 'support',
    memory_enabled: true,
    dest: { type: 'index', value: 'ai-index-idx-support' },
  } as AiIndexHttpItem;

  const run = () =>
    getWritableMemoryAiIndex({
      aiIndexId: 'support',
      spaceId: 'space-1',
      request,
      getAiIndexService: async () => ({ get } as unknown as AiIndexService),
      getCoreStart: async () => coreStart,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    globalSettingsGet.mockResolvedValue(true);
    coreStart.uiSettings.globalAsScopedToClient = jest
      .fn()
      .mockReturnValue({ get: globalSettingsGet });
    get.mockResolvedValue(aiIndex);
  });

  it('returns an AI index when global and per-index memory are enabled', async () => {
    await expect(run()).resolves.toBe(aiIndex);

    expect(globalSettingsGet).toHaveBeenCalledWith(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID);
    expect(get).toHaveBeenCalledWith('support', 'space-1');
  });

  it('rejects writes when global memory is disabled', async () => {
    globalSettingsGet.mockResolvedValue(false);

    await expect(run()).rejects.toThrow('Context Engine memory is not enabled.');
  });

  it('rejects writes when memory is disabled for the AI index', async () => {
    get.mockResolvedValue({ ...aiIndex, memory_enabled: false });

    await expect(run()).rejects.toThrow("AI index 'support' does not have memory enabled.");
  });

  it('rejects index-pattern destinations', async () => {
    get.mockResolvedValue({
      ...aiIndex,
      dest: { type: 'index', value: 'ai-index-idx-*' },
    });

    await expect(run()).rejects.toThrow(
      "AI index 'support' uses an index pattern and cannot accept memory writes."
    );
  });
});
