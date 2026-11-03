/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { InferenceFeatureRegistry } from '../inference_feature_registry';
import { createSearchInferenceEndpointsStart } from '../runtime';
import { createInferenceSettingsSavedObjectType } from '../saved_objects/inference_settings';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '../types';
import { searchInferenceEndpointsBridge } from './bridge';

interface TasksStartDeps {
  inference: Pick<InferenceServerStart, 'getConnectorById' | 'getConnectorList'>;
}

/**
 * Inference endpoint resolution for task runtimes: the saved object for model settings and the
 * feature registry that plugins register their features into. In Kibana both belong to the plugin
 * (see `bridge.ts`); a task pod builds its own, filled by the tasks entries of the plugins that
 * register features, such as agent builder.
 */
class SearchInferenceEndpointsTasksPlugin
  implements
    TasksPlugin<
      SearchInferenceEndpointsPluginSetup,
      SearchInferenceEndpointsPluginStart,
      {},
      TasksStartDeps
    >
{
  private readonly logger: Logger;
  private readonly featureRegistry: InferenceFeatureRegistry;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.featureRegistry = new InferenceFeatureRegistry(this.logger);
  }

  setup(core: CoreTasksSetup): SearchInferenceEndpointsPluginSetup {
    const real = searchInferenceEndpointsBridge.getSetup();
    if (real) return real;

    core.savedObjects.registerType(createInferenceSettingsSavedObjectType());
    return {
      features: { register: this.featureRegistry.register.bind(this.featureRegistry) },
    };
  }

  start(core: CoreTasksStart, { inference }: TasksStartDeps): SearchInferenceEndpointsPluginStart {
    const real = searchInferenceEndpointsBridge.getStart();
    if (real) return real;

    return createSearchInferenceEndpointsStart({
      core,
      inference,
      featureRegistry: this.featureRegistry,
      logger: this.logger,
    });
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new SearchInferenceEndpointsTasksPlugin(context);
