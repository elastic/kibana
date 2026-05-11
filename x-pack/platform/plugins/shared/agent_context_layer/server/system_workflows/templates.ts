/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import INDEX_AUGMENTATION_YAML from './templates/index_augmentation.yaml';
import INDEX_CRAWL_YAML from './templates/index_crawl.yaml';

/**
 * Bundled SML system workflow templates installed by the Agent Context Layer
 * admin page.
 *
 * The templates are NOT seeded at plugin start. The ACL admin page exposes an
 * "Install default workflows" action which calls
 * {@link installSystemWorkflows}; this is invoked from a route handler so the
 * standard `workflowsManagement.createWorkflow` API can be used with the
 * caller's `KibanaRequest` (matching the streams plugin convention — see
 * `x-pack/platform/plugins/shared/streams/server/lib/workflows/continuous_extraction_workflow.ts`).
 *
 * Workflows are tagged with `SML_SYSTEM_WORKFLOW_TAG` so the admin page can
 * list them with `getWorkflows({ tags: ['sml-system'] })`. Their ids use plain
 * `workflow-*` slugs (no reserved namespace) so they are valid through the
 * regular workflow id validator.
 *
 * The bundled templates ship a complete, runnable implementation of the SML
 * default workflows:
 *
 *  - `workflow-sml-index-augmentation` — inspects a single Elasticsearch index
 *    (mappings + 10 sample docs), asks an Agent Builder agent for a structured
 *    list of KPIs, and writes one SML chunk per KPI via the
 *    `agentContextLayer.smlIndexAttachment` step.
 *
 *  - `workflow-sml-index-crawl` — lists every open, non-hidden Elasticsearch
 *    index and runs the index augmentation workflow on each one. Ships
 *    disabled by default because the LLM cost scales with the number of
 *    indices; operators opt-in by enabling it or triggering it manually.
 *
 * Operators can edit the bundled YAML through the standard workflows
 * management UI; subsequent installs are idempotent and never overwrite local
 * edits.
 */
export interface SmlSystemWorkflowTemplate {
  /**
   * Fixed workflow id used as the `_id` of the stored document. Must be a
   * valid workflow id (lowercase alphanumeric + hyphens) and NOT use a
   * reserved namespace prefix.
   */
  id: string;
  /** Human-friendly description shown in the ACL admin page. */
  description: string;
  /** Workflow YAML definition. */
  yaml: string;
}

const INDEX_AUGMENTATION_TEMPLATE: SmlSystemWorkflowTemplate = {
  id: 'workflow-sml-index-augmentation',
  description:
    'Inspect an Elasticsearch index (mappings + 10 sample documents), ask an LLM via Agent Builder to extract KPIs, and index those KPIs into the Semantic Metadata Layer.',
  yaml: INDEX_AUGMENTATION_YAML,
};

const INDEX_CRAWL_TEMPLATE: SmlSystemWorkflowTemplate = {
  id: 'workflow-sml-index-crawl',
  description:
    'Discover every open Elasticsearch index visible to the caller and run the SML index augmentation workflow on each one. Ships disabled-by-default; trigger it manually after reviewing the cost implications.',
  yaml: INDEX_CRAWL_YAML,
};

export const SML_SYSTEM_WORKFLOW_TEMPLATES: readonly SmlSystemWorkflowTemplate[] = [
  INDEX_AUGMENTATION_TEMPLATE,
  INDEX_CRAWL_TEMPLATE,
];
