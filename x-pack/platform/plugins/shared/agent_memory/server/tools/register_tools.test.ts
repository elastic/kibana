/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformMemoryTools } from '@kbn/agent-builder-common';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MemoryService } from '../lib/memory';
import { createMemoryToolAvailability, registerMemoryTools } from './register_tools';
import type { MemoryToolsOptions } from './types';

const toolOptions: MemoryToolsOptions = {
  getMemoryService: (_esClient: ElasticsearchClient) => ({} as MemoryService),
  getSecurity: () => undefined,
};

const createAgentBuilderSetup = () => {
  const register = jest.fn();
  return { agentBuilder: { tools: { register } }, register };
};

describe('registerMemoryTools', () => {
  it('registers every memory tool', () => {
    const { agentBuilder, register } = createAgentBuilderSetup();

    registerMemoryTools({
      agentBuilder: agentBuilder as unknown as Parameters<
        typeof registerMemoryTools
      >[0]['agentBuilder'],
      availability: createMemoryToolAvailability({
        isMemoryEnabled: () => true,
        isStorageInstalled: () => true,
      }),
      toolOptions,
    });

    expect(register.mock.calls.map(([tool]) => tool.id).sort()).toEqual(
      Object.values(platformMemoryTools).sort()
    );
  });

  /**
   * `tools.register` throws at Kibana setup for an id missing from the allow list,
   * which would take the whole deployment down rather than failing CI. Catch it here.
   */
  it('registers only ids that are in the built-in tool allow list', () => {
    for (const toolId of Object.values(platformMemoryTools)) {
      expect(isAllowedBuiltinTool(toolId)).toBe(true);
    }
  });

  it('attaches the availability gate to every tool', () => {
    const { agentBuilder, register } = createAgentBuilderSetup();
    const availability = createMemoryToolAvailability({
      isMemoryEnabled: () => true,
      isStorageInstalled: () => true,
    });

    registerMemoryTools({
      agentBuilder: agentBuilder as unknown as Parameters<
        typeof registerMemoryTools
      >[0]['agentBuilder'],
      availability,
      toolOptions,
    });

    for (const [tool] of register.mock.calls) {
      expect(tool.availability).toBe(availability);
    }
  });
});

describe('createMemoryToolAvailability', () => {
  it('is unavailable when memory is disabled', async () => {
    const availability = createMemoryToolAvailability({
      isMemoryEnabled: () => false,
      isStorageInstalled: () => true,
    });

    await expect(availability.handler({} as never)).resolves.toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );
  });

  it('is unavailable until storage has been created', async () => {
    const availability = createMemoryToolAvailability({
      isMemoryEnabled: () => true,
      isStorageInstalled: () => false,
    });

    await expect(availability.handler({} as never)).resolves.toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );
  });

  it('is available once enabled and installed', async () => {
    const availability = createMemoryToolAvailability({
      isMemoryEnabled: () => true,
      isStorageInstalled: () => true,
    });

    await expect(availability.handler({} as never)).resolves.toEqual({ status: 'available' });
  });

  it('caches per space, short enough to reflect an enablement change quickly', () => {
    const availability = createMemoryToolAvailability({
      isMemoryEnabled: () => true,
      isStorageInstalled: () => true,
    });

    expect(availability.cacheMode).toBe('space');
    expect(availability.cacheTtl).toBeLessThanOrEqual(60);
  });
});
