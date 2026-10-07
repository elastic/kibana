/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const newExperimentStrings = {
  title: i18n.translate('xpack.evals.newExperiment.title', { defaultMessage: 'New experiment' }),
  nameLabel: i18n.translate('xpack.evals.newExperiment.nameLabel', {
    defaultMessage: 'Experiment name',
  }),
  namePlaceholder: i18n.translate('xpack.evals.newExperiment.namePlaceholder', {
    defaultMessage: 'Optional — a default is derived from the task target',
  }),
  connectorsLabel: i18n.translate('xpack.evals.newExperiment.connectorsLabel', {
    defaultMessage: 'Model connector(s)',
  }),
  connectorsHelp: i18n.translate('xpack.evals.newExperiment.connectorsHelp', {
    defaultMessage: 'Select two or more connectors to run a cross-model comparison.',
  }),
  taskTargetLabel: i18n.translate('xpack.evals.newExperiment.taskTargetLabel', {
    defaultMessage: 'What to evaluate',
  }),
  agentIdLabel: i18n.translate('xpack.evals.newExperiment.agentIdLabel', {
    defaultMessage: 'Agent ID',
  }),
  agentIdHelp: i18n.translate('xpack.evals.newExperiment.agentIdHelp', {
    defaultMessage: 'Pick an existing agent or type a custom agent ID.',
  }),
  datasetsLabel: i18n.translate('xpack.evals.newExperiment.datasetsLabel', {
    defaultMessage: 'Dataset(s)',
  }),
  evaluatorsLabel: i18n.translate('xpack.evals.newExperiment.evaluatorsLabel', {
    defaultMessage: 'Evaluators',
  }),
  judgeConnectorLabel: i18n.translate('xpack.evals.newExperiment.judgeConnectorLabel', {
    defaultMessage: 'Judge connector',
  }),
  repetitionsLabel: i18n.translate('xpack.evals.newExperiment.repetitionsLabel', {
    defaultMessage: 'Repetitions',
  }),
  concurrencyLabel: i18n.translate('xpack.evals.newExperiment.concurrencyLabel', {
    defaultMessage: 'Concurrency',
  }),
  spacesLabel: i18n.translate('xpack.evals.newExperiment.spacesLabel', {
    defaultMessage: 'Spaces',
  }),
  spacesHelp: i18n.translate('xpack.evals.newExperiment.spacesHelp', {
    defaultMessage:
      'Spaces this experiment is visible in. Defaults to the current space, but you can add others to share the results with them.',
  }),
  showYaml: i18n.translate('xpack.evals.newExperiment.showYaml', {
    defaultMessage: 'Show workflow YAML',
  }),
  compareLabel: i18n.translate('xpack.evals.newExperiment.compareLabel', {
    defaultMessage: 'Add model comparison step',
  }),
  compareHelp: i18n.translate('xpack.evals.newExperiment.compareHelp', {
    defaultMessage:
      'Adds a step to the saved workflow (shown in the YAML preview) that compares results across the selected models. "Run now" doesn\'t need this step — you can compare models from the run overview instead.',
  }),
  runNow: i18n.translate('xpack.evals.newExperiment.runNow', { defaultMessage: 'Run now' }),
  saveAsWorkflow: i18n.translate('xpack.evals.newExperiment.saveAsWorkflow', {
    defaultMessage: 'Save as workflow',
  }),
  savedBody: i18n.translate('xpack.evals.newExperiment.savedBody', {
    defaultMessage:
      'Your experiment is saved as a reusable workflow. Run it now to see results here, or open it in Workflows to run it later, schedule it, or edit it.',
  }),
  savedRunIt: i18n.translate('xpack.evals.newExperiment.savedRunIt', {
    defaultMessage: 'Run it now',
  }),
  savedOpen: i18n.translate('xpack.evals.newExperiment.savedOpen', {
    defaultMessage: 'Open in Workflows',
  }),
  savedClose: i18n.translate('xpack.evals.newExperiment.savedClose', { defaultMessage: 'Close' }),
  cancel: i18n.translate('xpack.evals.newExperiment.cancel', { defaultMessage: 'Cancel' }),
  chooseConnectorTitle: i18n.translate('xpack.evals.newExperiment.chooseConnectorTitle', {
    defaultMessage: 'Task target',
  }),
};
