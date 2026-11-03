/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { APMSourcesAccessConfig } from '../../common/config_schema';
import { createApmSourcesServices, createGetApmIndices } from '../runtime';
import { apmIndicesSavedObjectDefinition } from '../saved_objects/apm_indices';
import { apmSourcesAccessBridge } from './bridge';

export { config } from '../config';

export type ApmSourcesAccessTasksSetup = ReturnType<typeof createApmSourcesServices>;
export interface ApmSourcesAccessTasksStart {
  getApmIndices: ReturnType<typeof createGetApmIndices>;
}

/**
 * APM sources (the indices APM data lives in) for a task pod: the saved object type of the APM
 * indices settings and the same index resolution as the plugin's `server` entry (no routes). In
 * Kibana this entry hands out the plugin's own contracts (see `bridge.ts`).
 */
class ApmSourcesAccessTasksPlugin
  implements TasksPlugin<ApmSourcesAccessTasksSetup, ApmSourcesAccessTasksStart>
{
  private readonly config: APMSourcesAccessConfig;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<APMSourcesAccessConfig>();
  }

  setup(core: CoreTasksSetup): ApmSourcesAccessTasksSetup {
    const real = apmSourcesAccessBridge.getSetup();
    if (real) return real;

    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);
    return createApmSourcesServices(this.config);
  }

  start(): ApmSourcesAccessTasksStart {
    return apmSourcesAccessBridge.getStart() ?? { getApmIndices: createGetApmIndices(this.config) };
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new ApmSourcesAccessTasksPlugin(context);
