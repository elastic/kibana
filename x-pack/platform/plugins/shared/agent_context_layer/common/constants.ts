/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const internalApiPath = '/internal/agent_context_layer';
export const smlSearchPath = `${internalApiPath}/sml/_search`;

/**
 * Routes powering the ACL management UI. They proxy to the workflows
 * management API and restrict scope to workflows carrying the
 * {@link SML_SYSTEM_WORKFLOW_TAG} tag (set by the install routine).
 */
export const systemWorkflowsListPath = `${internalApiPath}/system_workflows`;
export const systemWorkflowsInstallPath = `${internalApiPath}/system_workflows/_install`;
export const systemWorkflowItemPath = `${internalApiPath}/system_workflows/{id}`;
export const systemWorkflowStartPath = `${internalApiPath}/system_workflows/{id}/_start`;
export const systemWorkflowCancelExecutionPath = `${internalApiPath}/system_workflows/{id}/executions/{executionId}/_cancel`;
export const systemWorkflowResumeExecutionPath = `${internalApiPath}/system_workflows/{id}/executions/{executionId}/_resume`;
export const systemWorkflowExecutionsPath = `${internalApiPath}/system_workflows/{id}/executions`;

/**
 * Tag applied to every SML-owned workflow when installed. The ACL admin
 * page filters workflows by this tag (since Elasticsearch disallows prefix
 * queries on the `_id` meta field, we use a tag instead of an id namespace).
 */
export const SML_SYSTEM_WORKFLOW_TAG = 'sml-system';

/**
 * Stable ids for the bundled SML system workflows. Used both for installation
 * (`installSystemWorkflows`) and for matching against runtime executions when
 * the ACL admin page builds per-workflow progress summaries.
 */
export const SML_INDEX_AUGMENTATION_WORKFLOW_ID = 'workflow-sml-index-augmentation';
export const SML_INDEX_CRAWL_WORKFLOW_ID = 'workflow-sml-index-crawl';

/**
 * Step id inside the bundled `workflow-sml-index-crawl` workflow whose output
 * provides the total index count for the progress summary. Kept in shared
 * constants so it never drifts from the YAML template.
 */
export const SML_INDEX_CRAWL_LIST_STEP = 'list_indices';

/**
 * Shape of the per-execution progress summary returned alongside each running
 * workflow in the ACL admin list response. `kind` is keyed on the bundled
 * workflow id so the UI can render the right label.
 */
export type SmlSystemWorkflowProgress =
  | {
      kind: 'crawl';
      /** Total indices to process. `null` until `list_indices` produces output. */
      total: number | null;
      /** Number of child augmentations that have finished (any terminal state). */
      completed: number;
      /** Index whose augmentation is currently in flight, when known. */
      currentIndex: string | null;
    }
  | {
      kind: 'augmentation';
      /** Resolved value of the `indexPattern` workflow input. */
      indexPattern: string | null;
      /** Step id of the most recent in-flight step, or the last completed one. */
      currentStep: string | null;
    };
