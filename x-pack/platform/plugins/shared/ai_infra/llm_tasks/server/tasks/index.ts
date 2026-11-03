/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type { ProductDocBaseTasksStart } from '@kbn/product-doc-base-plugin/server/tasks';
import { createLlmTasksStart } from '../create_llm_tasks_start';
import type { LlmTasksPluginStart } from '../types';

export type LlmTasksTasksStart = LlmTasksPluginStart;

interface TasksStartDeps {
  inference: InferenceTasksStart;
  productDocBase: ProductDocBaseTasksStart;
}

/**
 * The LLM tasks for task runtimes (documentation retrieval and its availability check), built by the
 * same function as the plugin's start contract over the tasks contracts of inference and the
 * product documentation.
 */
class LlmTasksTasksPlugin implements TasksPlugin<void, LlmTasksTasksStart, object, TasksStartDeps> {
  constructor(private readonly context: PluginInitializerContext) {}

  setup() {}

  start(_core: CoreTasksStart, { inference, productDocBase }: TasksStartDeps): LlmTasksTasksStart {
    return createLlmTasksStart({
      inference: inference as never,
      productDocBase,
      logger: this.context.logger.get(),
    });
  }
}

export const plugin = async (context: PluginInitializerContext) => new LlmTasksTasksPlugin(context);
