/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EVALS_TOOLS_NAMESPACE = 'platform.evals';

export const evalsTool = (name: string) => `${EVALS_TOOLS_NAMESPACE}.${name}`;

export const LIST_EVAL_DATASETS_TOOL_ID = evalsTool('list_datasets');

/** Inline tool ids for the eval-experiment-authoring skill. */
export const evalsExperimentTools = {
  listDatasets: LIST_EVAL_DATASETS_TOOL_ID,
  listEvaluators: evalsTool('list_evaluators'),
  listTargets: evalsTool('list_targets'),
  listConnectors: evalsTool('list_connectors'),
  previewExperiment: evalsTool('preview_experiment'),
  saveExperiment: evalsTool('save_experiment'),
  runExperiment: evalsTool('run_experiment'),
} as const;

/** Inline tool ids for the eval-dataset-management skill. */
export const evalsDatasetTools = {
  listDatasets: LIST_EVAL_DATASETS_TOOL_ID,
  getDataset: evalsTool('get_dataset'),
  createDataset: evalsTool('create_dataset'),
  upsertDataset: evalsTool('upsert_dataset'),
  copyDataset: evalsTool('copy_dataset'),
  deleteDataset: evalsTool('delete_dataset'),
} as const;
