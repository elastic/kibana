/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { getWritableMemoryAiIndex } from './get_writable_memory_ai_index';

describe('getWritableMemoryAiIndex', () => {
  const request = httpServerMock.createKibanaRequest();
  const get = jest.fn();
  const coreStart = coreMock.createStart();
  const aiIndex = {
    id: 'support',
    managed: false,
    dest: { type: 'index', value: 'ai-index-idx-support' },
  } as AiIndexItem;
  let settings: Record<string, boolean>;

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
    settings = { [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true };
    coreStart.uiSettings.globalAsScopedToClient = jest
      .fn()
      .mockReturnValue({ get: async (id: string) => settings[id] });
    get.mockResolvedValue(aiIndex);
  });

  it('returns an AI index that is not managed when global memory is on', async () => {
    await expect(run()).resolves.toBe(aiIndex);

    expect(get).toHaveBeenCalledWith('support', 'space-1');
  });

  it('rejects writes when global memory is disabled', async () => {
    settings[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID] = false;

    await expect(run()).rejects.toThrow('Context Engine memory is not enabled.');
  });

  it('rejects writes to a managed AI index without dreaming set up', async () => {
    get.mockResolvedValue({ ...aiIndex, managed: true });

    await expect(run()).rejects.toThrow("AI index 'support' does not take memories.");
  });

  it('accepts writes to a managed AI index once its dreaming is set up, even paused', async () => {
    const managed = {
      ...aiIndex,
      managed: true,
      dreaming: { enabled: false, facts: [{ type: 'preference' }] },
    };
    get.mockResolvedValue(managed);

    await expect(run()).resolves.toEqual(managed);
  });

  it('rejects writes to an AI index saved with memory_enabled false', async () => {
    get.mockResolvedValue({ ...aiIndex, memory_enabled: false });

    await expect(run()).rejects.toThrow("AI index 'support' does not take memories.");
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
