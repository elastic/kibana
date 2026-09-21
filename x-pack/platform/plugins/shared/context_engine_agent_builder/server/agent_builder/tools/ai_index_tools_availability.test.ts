/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CoreStart } from '@kbn/core/server';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/context-engine-plugin/common/constants';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { AvailabilityContext } from '@kbn/agent-builder-server';
import {
  aiIndexToolsAvailability,
  createMemoryToolsAvailability,
} from './ai_index_tools_availability';

describe('aiIndexToolsAvailability', () => {
  const createContext = (settings: Record<string, boolean | Error>): AvailabilityContext => ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    uiSettings: {
      get: jest.fn(async (key: string) => {
        const value = settings[key];
        if (value instanceof Error) {
          throw value;
        }
        return value;
      }),
    } as unknown as AvailabilityContext['uiSettings'],
  });

  it('caches per space', () => {
    expect(aiIndexToolsAvailability.cacheMode).toBe('space');
  });

  it('is available when Context Engine is enabled', async () => {
    const result = await aiIndexToolsAvailability.handler(
      createContext({ [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true })
    );

    expect(result).toEqual({ status: 'available' });
  });

  it('is unavailable when Context Engine is off', async () => {
    const result = await aiIndexToolsAvailability.handler(
      createContext({ [CONTEXT_ENGINE_ENABLED_SETTING_ID]: false })
    );

    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('Context Engine');
  });

  it('treats an unreadable setting as disabled', async () => {
    const result = await aiIndexToolsAvailability.handler(
      createContext({ [CONTEXT_ENGINE_ENABLED_SETTING_ID]: new Error('unregistered') })
    );

    expect(result.status).toBe('unavailable');
  });

  describe('memory tools', () => {
    const createAvailability = (memoryEnabled: boolean) => {
      const coreStart = {
        savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) },
        uiSettings: {
          globalAsScopedToClient: jest.fn().mockReturnValue({
            get: jest.fn(async (key: string) =>
              key === CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID ? memoryEnabled : undefined
            ),
          }),
        },
      } as unknown as CoreStart;
      return createMemoryToolsAvailability(async () => coreStart);
    };

    it('is available when Context Engine and memory are enabled', async () => {
      const availability = createAvailability(true);

      await expect(
        availability.handler(createContext({ [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true }))
      ).resolves.toEqual({ status: 'available' });
    });

    it('is unavailable when the global memory flag is disabled', async () => {
      const availability = createAvailability(false);

      await expect(
        availability.handler(createContext({ [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true }))
      ).resolves.toEqual({
        status: 'unavailable',
        reason: 'Context Engine memory is disabled.',
      });
    });
  });
});
