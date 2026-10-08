/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EVALS_TOOLS_NAMESPACE = 'platform.evals';

const evalsTool = (name: string) => `${EVALS_TOOLS_NAMESPACE}.${name}`;

/**
 * Inline tool ids for the eval-experiment-authoring skill. Ids must not overlap
 * with other skills' inline tools, which Agent Builder would rename on collision.
 */
export const evalsExperimentTools = {
  listDatasets: evalsTool('experiments.list_datasets'),
  listEvaluators: evalsTool('list_evaluators'),
  listTargets: evalsTool('list_targets'),
  listConnectors: evalsTool('list_connectors'),
  previewExperiment: evalsTool('preview_experiment'),
  saveExperiment: evalsTool('save_experiment'),
  runExperiment: evalsTool('run_experiment'),
} as const;

/** Inline tool ids for the eval-dataset-management skill. */
export const evalsDatasetTools = {
  listDatasets: evalsTool('datasets.list_datasets'),
  getDataset: evalsTool('get_dataset'),
  createDataset: evalsTool('create_dataset'),
  upsertDataset: evalsTool('upsert_dataset'),
  editExamples: evalsTool('edit_examples'),
  copyDataset: evalsTool('copy_dataset'),
  deleteDataset: evalsTool('delete_dataset'),
} as const;
