/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  Logger,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import { RegexWorkerService } from '@kbn/ai-anonymization-server';
import type { InferenceConfig } from '../config';
import { configSchema } from '../config';
import { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import { TokenUsageLogger } from '../token_usage';
import type { FeatureEndpointResolver } from '../types';
import type { InferenceServerSetup } from '../types';
import { createInferenceStart } from '../runtime';
import type { InferenceRuntimeStart } from '../runtime';
import { inferenceBridge } from './bridge';

export const config: PluginConfigDescriptor<InferenceConfig> = { schema: configSchema };

/** What a task runtime can do with inference: clients, chat models, connectors and endpoints. */
export type InferenceTasksStart = InferenceRuntimeStart;

interface TasksStartDeps {
  actions: ActionsTasksStart;
}

/**
 * Inference for task runtimes: the same clients and chat models the plugin provides, over the
 * runtime's own \`actions\`. In Kibana the plugin's start is used (see \`bridge.ts\`). Installing the
 * token usage dashboard and the settings routes belong to Kibana.
 */
class InferenceTasksPlugin
  implements TasksPlugin<InferenceServerSetup, InferenceTasksStart, {}, TasksStartDeps>
{
  private readonly logger: Logger;
  private readonly config: InferenceConfig;
  private readonly endpointIdCache = new InferenceEndpointIdCache();
  private readonly tokenUsageLogger: TokenUsageLogger;
  private regexWorker?: RegexWorkerService;
  private featureEndpointResolver?: FeatureEndpointResolver;

  constructor(context: PluginInitializerContext<InferenceConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get<InferenceConfig>();
    this.tokenUsageLogger = new TokenUsageLogger(this.logger);
  }

  setup(_core: CoreTasksSetup): InferenceServerSetup {
    const real = inferenceBridge.getSetup();
    if (real) return real;

    return {
      registerFeatureEndpointResolver: (resolver) => {
        if (this.featureEndpointResolver) {
          throw new Error('A feature endpoint resolver is already registered');
        }
        this.featureEndpointResolver = resolver;
      },
    };
  }

  start(core: CoreTasksStart, { actions }: TasksStartDeps): InferenceTasksStart {
    const real = inferenceBridge.getStart();
    if (real) return real;

    const regexWorker = new RegexWorkerService(
      this.config.workers.anonymization,
      this.logger.get('regex_worker')
    );
    this.regexWorker = regexWorker;
    return createInferenceStart({
      core,
      pluginsStart: { actions: actions as never, anonymization: undefined },
      logger: this.logger,
      endpointIdCache: this.endpointIdCache,
      tokenUsageLogger: this.tokenUsageLogger,
      regexWorker,
      getFeatureEndpointResolver: () => this.featureEndpointResolver,
    });
  }

  async stop() {
    await this.regexWorker?.stop();
  }
}

export const plugin = async (context: PluginInitializerContext<InferenceConfig>) =>
  new InferenceTasksPlugin(context);
