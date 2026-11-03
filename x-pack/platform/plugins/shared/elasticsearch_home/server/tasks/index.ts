/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { registerSearchSkills } from '../skills/register_search_skills';
import type { ElasticsearchHomeServerSetupDependencies } from '../types';

interface TasksSetupDeps {
  agentBuilder: NonNullable<ElasticsearchHomeServerSetupDependencies['agentBuilder']>;
}

/** The agent builder side of Elasticsearch home for a task pod: its search skills. */
class ElasticsearchHomeTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(_core: CoreTasksSetup, { agentBuilder }: TasksSetupDeps) {
    registerSearchSkills({ agentBuilder, logger: this.logger });
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext) =>
  new ElasticsearchHomeTasksPlugin(context);
