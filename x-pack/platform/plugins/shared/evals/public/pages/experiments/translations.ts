/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_DESCRIPTION = i18n.translate('xpack.evals.experiments.pageDescription', {
  defaultMessage:
    'Run registered experiment suites via Kibana Workflows. Results are exported to the evaluations data stream and will appear in the Runs tab once complete.',
});

export const COLUMN_SUITE = i18n.translate('xpack.evals.experiments.columns.suite', {
  defaultMessage: 'Suite',
});

export const COLUMN_SUITE_ID = i18n.translate('xpack.evals.experiments.columns.suiteId', {
  defaultMessage: 'Suite ID',
});

export const COLUMN_DESCRIPTION = i18n.translate('xpack.evals.experiments.columns.description', {
  defaultMessage: 'Description',
});

export const COLUMN_TAGS = i18n.translate('xpack.evals.experiments.columns.tags', {
  defaultMessage: 'Tags',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.evals.experiments.columns.actions', {
  defaultMessage: 'Actions',
});

export const RUN_NOW_BUTTON = i18n.translate('xpack.evals.experiments.actions.runNow', {
  defaultMessage: 'Run now',
});

export const RUN_MODAL_TITLE = i18n.translate('xpack.evals.experiments.runModal.title', {
  defaultMessage: 'Run experiment suite',
});

export const TASK_CONNECTOR_LABEL = i18n.translate(
  'xpack.evals.experiments.runModal.taskConnectorLabel',
  { defaultMessage: 'Task connector' }
);

export const JUDGE_CONNECTOR_LABEL = i18n.translate(
  'xpack.evals.experiments.runModal.judgeConnectorLabel',
  { defaultMessage: 'Judge connector' }
);

export const REPETITIONS_LABEL = i18n.translate(
  'xpack.evals.experiments.runModal.repetitionsLabel',
  {
    defaultMessage: 'Repetitions',
  }
);

export const SUITE_PARAMS_LABEL = i18n.translate(
  'xpack.evals.experiments.runModal.suiteParamsLabel',
  {
    defaultMessage: 'Suite params (JSON)',
  }
);

export const CANCEL_BUTTON = i18n.translate('xpack.evals.experiments.runModal.cancelButton', {
  defaultMessage: 'Cancel',
});

export const START_RUN_BUTTON = i18n.translate('xpack.evals.experiments.runModal.startRunButton', {
  defaultMessage: 'Start run',
});

export const LATEST_RUN_TITLE = i18n.translate('xpack.evals.experiments.latestRun.title', {
  defaultMessage: 'Latest experiment run',
});

export const VIEW_RUN_DETAILS_BUTTON = i18n.translate(
  'xpack.evals.experiments.latestRun.viewRunDetails',
  {
    defaultMessage: 'View run details',
  }
);

export const WORKFLOW_EXECUTION_LABEL = i18n.translate(
  'xpack.evals.experiments.latestRun.workflowExecutionLabel',
  { defaultMessage: 'Workflow execution' }
);

export const STATUS_LABEL = i18n.translate('xpack.evals.experiments.latestRun.statusLabel', {
  defaultMessage: 'Status',
});

export const CANCEL_RUN_BUTTON = i18n.translate(
  'xpack.evals.experiments.latestRun.cancelRunButton',
  {
    defaultMessage: 'Cancel run',
  }
);

export const LOGS_TITLE = i18n.translate('xpack.evals.experiments.latestRun.logsTitle', {
  defaultMessage: 'Execution logs',
});

export const RUNS_TAB_CALLOUT_TITLE = i18n.translate(
  'xpack.evals.experiments.runsTabCallout.title',
  {
    defaultMessage: 'Looking for past run results?',
  }
);

export const RUNS_TAB_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.evals.experiments.runsTabCallout.description',
  {
    defaultMessage:
      'Completed experiment runs are persisted and available on the Runs tab with scores, model details, and per-example breakdowns.',
  }
);

export const VIEW_RUNS_BUTTON = i18n.translate('xpack.evals.experiments.runsTabCallout.viewRuns', {
  defaultMessage: 'View runs',
});

export const UNAVAILABLE_TITLE = i18n.translate('xpack.evals.experiments.unavailable.title', {
  defaultMessage: 'Experiments are unavailable',
});

export const UNAVAILABLE_REASON_FALLBACK = i18n.translate(
  'xpack.evals.experiments.unavailable.fallbackReason',
  {
    defaultMessage:
      'Experiments require the Kibana Workflows plugins. Enable workflowsManagement and workflowsExtensions to dispatch and observe runs.',
  }
);

export const UNAVAILABLE_MISSING_PLUGINS_LABEL = i18n.translate(
  'xpack.evals.experiments.unavailable.missingPluginsLabel',
  {
    defaultMessage: 'Missing plugins:',
  }
);
