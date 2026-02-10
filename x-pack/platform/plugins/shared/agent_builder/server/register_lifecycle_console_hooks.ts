/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console -- this file exists to log hook lifecycle to the console when running the app */
import type { HooksServiceSetup } from '@kbn/agent-builder-server';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';

/**
 * Registers one hook per lifecycle that logs the hook name to the console.
 * Useful when running the app to see when each lifecycle runs (beforeAgent, afterAgent, beforeToolCall, afterToolCall).
 */
export const registerLifecycleConsoleHooks = (hooksSetup: HooksServiceSetup): void => {
  hooksSetup.register({
    id: 'lifecycle-console',
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          console.log('[Agent Builder] hook:', HookLifecycle.beforeAgent);
        },
      },
      [HookLifecycle.afterAgent]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          console.log('[Agent Builder] hook:', HookLifecycle.afterAgent);
        },
      },
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          console.log('[Agent Builder] hook:', HookLifecycle.beforeToolCall);
        },
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          console.log('[Agent Builder] hook:', HookLifecycle.afterToolCall);
        },
      },
    },
  });
};
