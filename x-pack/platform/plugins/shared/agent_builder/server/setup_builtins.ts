/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { registerSkillToolsLoaderHook } from './hooks/skills/register_skill_tools_loader_hook';
import { createRelevantSkillsCycleHook } from './services/execution/run_agent/cycle_hooks/relevant_skills_hook';
import { createConnectorTools } from './services/tools/builtin/connectors';
import type { InternalSetupServices } from './services/types';
import type { AgentBuilderStartDependencies } from './types';

/**
 * What agent builder registers into its own services during setup whatever the runtime: the hooks
 * that choose skills and load their tools, and the tools over connectors. The plugin does this in Kibana
 * and its tasks entry in a task pod, so an agent has the same built-ins in both.
 */
export const registerBuiltinSetup = ({
  serviceSetups,
  getStartServices,
  analyticsService,
  trackingService,
}: {
  serviceSetups: InternalSetupServices;
  getStartServices: () => Promise<
    [Awaited<ReturnType<CoreSetup['getStartServices']>>[0], AgentBuilderStartDependencies, unknown]
  >;
  analyticsService?: NonNullable<
    Parameters<typeof registerSkillToolsLoaderHook>[1]
  >['analyticsService'];
  trackingService?: NonNullable<
    Parameters<typeof registerSkillToolsLoaderHook>[1]
  >['trackingService'];
}) => {
  serviceSetups.hooks.registerCycleHook(
    createRelevantSkillsCycleHook({
      getUiSettings: async () => (await getStartServices())[0].uiSettings,
    })
  );
  registerSkillToolsLoaderHook(serviceSetups, { analyticsService, trackingService });
  createConnectorTools({
    getActions: async () => (await getStartServices())[1].actions,
    getInference: async () => (await getStartServices())[1].inference,
  }).forEach((tool) => {
    serviceSetups.tools.register(tool);
  });
};
