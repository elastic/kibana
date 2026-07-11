/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { EvalsSkillsStartDependencies } from '../../../types';

/**
 * Services shared by every inline tool of the eval-experiments skill.
 *
 * `workflowsApi` and `serverBasePath` are resolved at plugin setup, while the
 * `evals` and `agentBuilder` start contracts are resolved lazily per tool call
 * (they are only available once the plugins have started).
 */
export interface EvalExperimentsToolDeps {
  /** Workflows management API (`workflowsManagement.management`), used to save/run experiments. */
  workflowsApi: WorkflowsManagementApi;
  /** Configured server base path (without any space segment); used to build result deep links. */
  serverBasePath: string;
  /** Lazily resolves the plugin's start dependencies (`evals` + `agentBuilder`). */
  getStartDependencies: () => Promise<EvalsSkillsStartDependencies>;
}
