/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, CoreTasksStart } from '@kbn/core/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';

/** What the tools use of Core at start: Elasticsearch and UI settings. */
export type PlatformCoreStart = Pick<CoreTasksStart, 'elasticsearch' | 'uiSettings'>;

/** The plugins the tools and attachment types use at start. Optional ones are absent in a task pod. */
export interface PlatformStartDeps {
  llmTasks?: LlmTasksPluginStart;
}

/**
 * The part of Core setup the tools use (the base path and the start services), so Kibana's `server`
 * entry and the task pod's `server/tasks` entry register the same tools.
 */
export interface PlatformCoreSetup {
  http: Pick<CoreTasksSetup['http'], 'basePath'>;
  getStartServices: () => Promise<[PlatformCoreStart, PlatformStartDeps, unknown]>;
}
