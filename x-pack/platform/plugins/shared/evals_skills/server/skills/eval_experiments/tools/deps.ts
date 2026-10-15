/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { EvalsSkillsStartDependencies } from '../../../types';

/** Services shared by every inline tool of the eval-experiment-authoring skill. */
export interface EvalExperimentsToolDeps {
  /** Workflows management API - used to save/run experiments. */
  workflowsApi: WorkflowsManagementApi;
  /** Configured server base path (without any space segment) - used to build result deep links. */
  serverBasePath: string;
  logger: Logger;
  getStartDependencies: () => Promise<EvalsSkillsStartDependencies>;
}
