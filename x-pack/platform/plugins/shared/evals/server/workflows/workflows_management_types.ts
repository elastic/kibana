/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementExecutionApi } from '@kbn/workflows/server';

/**
 * The evals routes need to launch and track workflow executions, but the evals
 * plugin cannot take a project reference to `@kbn/workflows-management-plugin`:
 * that would create a dependency cycle
 * (`evals -> workflows_management -> controls -> dashboard ->
 * observability_ai_assistant -> evals`).
 *
 * Instead we consume {@link WorkflowsManagementExecutionApi} — the execution-oriented
 * contract published by the low-level `@kbn/workflows` package and *implemented* by
 * the workflows management plugin's `WorkflowsManagementApi`. Because that concrete
 * class `implements` the shared interface (and the param/result types are defined
 * once, in `@kbn/workflows/server`), any change to the real API that would break this
 * integration fails the workflows management build first. This binding therefore
 * cannot silently drift from the actual implementation.
 */

export type {
  ExecuteInlineWorkflowParams,
  ExecuteWorkflowParams,
  ExecuteWorkflowResult,
  WorkflowsManagementExecutionApi,
} from '@kbn/workflows/server';

/** The evals-facing shape of the (optional) workflows management setup contract. */
export interface EvalsWorkflowsManagementSetup {
  management: WorkflowsManagementExecutionApi;
}
