/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_DESCRIPTION = i18n.translate('xpack.evals.onlineEvaluations.pageDescription', {
  defaultMessage:
    'Run registered online suites via Kibana Workflows. Results are exported to the evaluations data stream and will appear in the Runs tab once complete.',
});

export const COLUMN_SUITE = i18n.translate('xpack.evals.onlineEvaluations.columns.suite', {
  defaultMessage: 'Suite',
});

export const COLUMN_SUITE_ID = i18n.translate('xpack.evals.onlineEvaluations.columns.suiteId', {
  defaultMessage: 'Suite ID',
});

export const COLUMN_DESCRIPTION = i18n.translate(
  'xpack.evals.onlineEvaluations.columns.description',
  {
    defaultMessage: 'Description',
  }
);

export const COLUMN_ACTIONS = i18n.translate('xpack.evals.onlineEvaluations.columns.actions', {
  defaultMessage: 'Actions',
});

export const RUN_NOW_BUTTON = i18n.translate('xpack.evals.onlineEvaluations.actions.runNow', {
  defaultMessage: 'Run now',
});

export const RUN_MODAL_TITLE = i18n.translate('xpack.evals.onlineEvaluations.runModal.title', {
  defaultMessage: 'Run online suite',
});

export const TASK_CONNECTOR_LABEL = i18n.translate(
  'xpack.evals.onlineEvaluations.runModal.taskConnectorLabel',
  { defaultMessage: 'Task connector ID' }
);

export const JUDGE_CONNECTOR_LABEL = i18n.translate(
  'xpack.evals.onlineEvaluations.runModal.judgeConnectorLabel',
  { defaultMessage: 'Judge connector ID' }
);

export const REPETITIONS_LABEL = i18n.translate(
  'xpack.evals.onlineEvaluations.runModal.repetitionsLabel',
  {
    defaultMessage: 'Repetitions',
  }
);

export const SUITE_PARAMS_LABEL = i18n.translate(
  'xpack.evals.onlineEvaluations.runModal.suiteParamsLabel',
  {
    defaultMessage: 'Suite params (JSON)',
  }
);

export const CANCEL_BUTTON = i18n.translate('xpack.evals.onlineEvaluations.runModal.cancelButton', {
  defaultMessage: 'Cancel',
});

export const START_RUN_BUTTON = i18n.translate(
  'xpack.evals.onlineEvaluations.runModal.startRunButton',
  {
    defaultMessage: 'Start run',
  }
);

export const LATEST_RUN_TITLE = i18n.translate('xpack.evals.onlineEvaluations.latestRun.title', {
  defaultMessage: 'Latest online run',
});

export const VIEW_RUN_DETAILS_BUTTON = i18n.translate(
  'xpack.evals.onlineEvaluations.latestRun.viewRunDetails',
  {
    defaultMessage: 'View run details',
  }
);

export const WORKFLOW_EXECUTION_LABEL = i18n.translate(
  'xpack.evals.onlineEvaluations.latestRun.workflowExecutionLabel',
  { defaultMessage: 'Workflow execution' }
);

export const STATUS_LABEL = i18n.translate('xpack.evals.onlineEvaluations.latestRun.statusLabel', {
  defaultMessage: 'Status',
});

export const CANCEL_RUN_BUTTON = i18n.translate(
  'xpack.evals.onlineEvaluations.latestRun.cancelRunButton',
  {
    defaultMessage: 'Cancel run',
  }
);

export const LOGS_TITLE = i18n.translate('xpack.evals.onlineEvaluations.latestRun.logsTitle', {
  defaultMessage: 'Execution logs',
});
