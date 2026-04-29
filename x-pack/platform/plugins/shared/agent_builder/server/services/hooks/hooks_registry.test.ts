/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHookRegistry, buildHookRegistrationId } from './hooks_registry';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';

describe('buildHookRegistrationId', () => {
  it('returns bundleId-lifecycle', () => {
    expect(buildHookRegistrationId('my-bundle', HookLifecycle.beforeAgent)).toBe(
      'my-bundle-beforeAgent'
    );
    expect(buildHookRegistrationId('x', HookLifecycle.afterToolCall)).toBe('x-afterToolCall');
  });
});

describe('createHookRegistry', () => {
  it('returns empty hooks for a lifecycle when nothing registered', () => {
    const registry = createHookRegistry();
    expect(registry.getHooksForLifecycle(HookLifecycle.beforeAgent)).toEqual([]);
  });

  it('stores registered hooks and returns them via getHooksForLifecycle', () => {
    const registry = createHookRegistry();
    const handler = async () => ({});
    registry.register({
      id: 'b1',
      priority: 5,
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler,
        },
      },
    });

    const hooks = registry.getHooksForLifecycle(HookLifecycle.beforeAgent);
    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toMatchObject({
      id: 'b1-beforeAgent',
      priority: 5,
      mode: HookExecutionMode.blocking,
    });
  });

  it('throws when the same bundle id registers twice for the same lifecycle', () => {
    const registry = createHookRegistry();

    registry.register({
      id: 'dup',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        },
      },
    });

    expect(() =>
      registry.register({
        id: 'dup',
        hooks: {
          [HookLifecycle.beforeAgent]: {
            mode: HookExecutionMode.blocking,
            handler: async (ctx) => ctx,
          },
        },
      })
    ).toThrow(/Hook with id "dup-beforeAgent" is already registered/);
  });

  it('allows the same bundle id for different lifecycles', () => {
    const registry = createHookRegistry();

    registry.register({
      id: 'same',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        },
      },
    });
    registry.register({
      id: 'same',
      hooks: {
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        },
      },
    });

    expect(registry.getHooksForLifecycle(HookLifecycle.beforeAgent)).toHaveLength(1);
    expect(registry.getHooksForLifecycle(HookLifecycle.afterToolCall)).toHaveLength(1);
  });
});
