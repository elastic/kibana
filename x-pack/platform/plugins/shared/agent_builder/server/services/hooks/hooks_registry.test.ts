/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHookRegistry, buildHookRegistrationId } from './hooks_registry';
import {
  HookLifecycle,
  HookExecutionMode,
  MAX_CYCLE_HOOK_TIMEOUT_MS,
} from '@kbn/agent-builder-server';
import type { CycleHookDefinition } from '@kbn/agent-builder-server';

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

describe('registerCycleHook', () => {
  const definition = (
    id: string,
    overrides: Partial<CycleHookDefinition> = {}
  ): CycleHookDefinition => ({
    id,
    getHandler: () => undefined,
    ...overrides,
  });

  it('lists nothing when no cycle hook is registered', () => {
    const registry = createHookRegistry();
    expect(registry.getCycleHooks()).toEqual([]);
  });

  it('lists cycle hooks in registration order', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('second'));
    registry.registerCycleHook(definition('first', { when: 'first' }));

    expect(registry.getCycleHooks().map((hook) => hook.id)).toEqual(['second', 'first']);
  });

  it('returns a copy so callers cannot mutate the registry', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('a'));

    registry.getCycleHooks().pop();

    expect(registry.getCycleHooks()).toHaveLength(1);
  });

  it('keeps cycle hooks apart from lifecycle registrations', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('shared-id'));
    registry.register({
      id: 'shared-id',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        },
      },
    });

    expect(registry.getCycleHooks()).toHaveLength(1);
    expect(registry.getHooksForLifecycle(HookLifecycle.beforeAgent)).toHaveLength(1);
  });

  it('throws on a duplicate id', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('dup'));

    expect(() => registry.registerCycleHook(definition('dup'))).toThrow(
      /Cycle hook with id "dup" is already registered/
    );
  });

  it('throws on an empty id', () => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition(''))).toThrow(/id must not be empty/);
  });

  it.each([0, -1, 1.5, NaN])('rejects everyCycles of %p', (everyCycles) => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition('bad', { when: { everyCycles } }))).toThrow(
      /everyCycles must be a positive integer/
    );
  });

  it('stores the agents a hook is bound to', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('bound', { boundAgents: ['nightshift.investigator'] }));
    registry.registerCycleHook(definition('global'));

    expect(registry.getCycleHooks().map((hook) => hook.boundAgents)).toEqual([
      ['nightshift.investigator'],
      undefined,
    ]);
  });

  it('rejects an empty boundAgents list', () => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition('bad', { boundAgents: [] }))).toThrow(
      /boundAgents must list at least one agent id/
    );
  });

  it.each([[''], ['ok', '']])('rejects boundAgents %j', (...boundAgents: string[]) => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition('bad', { boundAgents }))).toThrow(
      /boundAgents must contain non-empty agent ids/
    );
  });

  it('accepts the string triggers and a positive everyCycles', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('a', { when: 'first' }));
    registry.registerCycleHook(definition('b', { when: 'every_cycle' }));
    registry.registerCycleHook(definition('c', { when: { everyCycles: 5 } }));

    expect(registry.getCycleHooks()).toHaveLength(3);
  });

  it('rejects an unknown string trigger', () => {
    const registry = createHookRegistry();

    expect(() =>
      registry.registerCycleHook(
        definition('bad', { when: 'sometimes' as unknown as CycleHookDefinition['when'] })
      )
    ).toThrow(/unknown trigger "sometimes"/);
  });

  it.each([0, -5, MAX_CYCLE_HOOK_TIMEOUT_MS + 1])('rejects a timeout of %p', (timeout) => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition('bad', { timeout }))).toThrow(
      /timeout must be between 1 and/
    );
  });

  it('accepts a timeout within the allowed range', () => {
    const registry = createHookRegistry();
    registry.registerCycleHook(definition('ok', { timeout: MAX_CYCLE_HOOK_TIMEOUT_MS }));

    expect(registry.getCycleHooks()[0].timeout).toBe(MAX_CYCLE_HOOK_TIMEOUT_MS);
  });

  it('does not register a definition that failed validation', () => {
    const registry = createHookRegistry();

    expect(() => registry.registerCycleHook(definition('bad', { timeout: 0 }))).toThrow();
    expect(registry.getCycleHooks()).toEqual([]);
  });
});
