/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { InternalSetupServices } from '../../services';
import { loadSkillToolsAfterRead } from './load_skill_tools_after_read';

/**
 * Registers a blocking afterToolCall hook that dynamically loads a skill's
 * tools into the tool manager when the agent reads a skill file.
 */
export const registerSkillToolsLoaderHook = (serviceSetups: InternalSetupServices): void => {
  serviceSetups.hooks.register({
    id: 'skill-tools-loader',
    hooks: {
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: loadSkillToolsAfterRead,
      },
    },
  });
};
