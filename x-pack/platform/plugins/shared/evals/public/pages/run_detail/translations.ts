/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BREADCRUMB_EVALUATIONS = i18n.translate(
  'xpack.evals.runDetail.breadcrumbEvaluations',
  { defaultMessage: 'Evaluations' }
);

export const STAT_TASK_MODEL = i18n.translate('xpack.evals.runDetail.stat.taskModel', {
  defaultMessage: 'Task Model',
});

export const STAT_EVALUATOR_MODEL = i18n.translate('xpack.evals.runDetail.stat.evaluatorModel', {
  defaultMessage: 'Evaluator Model',
});

export const STAT_REPETITIONS = i18n.translate('xpack.evals.runDetail.stat.repetitions', {
  defaultMessage: 'Repetitions',
});

export const SECTION_DATASETS = i18n.translate('xpack.evals.runDetail.section.datasets', {
  defaultMessage: 'Datasets',
});

export const SECTION_EVALUATOR_STATS = i18n.translate(
  'xpack.evals.runDetail.section.evaluatorStats',
  { defaultMessage: 'Evaluator Statistics' }
);

export const SECTION_EXAMPLE_SCORES = i18n.translate(
  'xpack.evals.runDetail.section.exampleScores',
  {
    defaultMessage: 'Example Scores',
  }
);

export const COLUMN_EVALUATOR = i18n.translate('xpack.evals.runDetail.columns.evaluator', {
  defaultMessage: 'Evaluator',
});

export const COLUMN_MEAN = i18n.translate('xpack.evals.runDetail.columns.mean', {
  defaultMessage: 'Mean',
});

export const COLUMN_MEDIAN = i18n.translate('xpack.evals.runDetail.columns.median', {
  defaultMessage: 'Median',
});

export const COLUMN_STD_DEV = i18n.translate('xpack.evals.runDetail.columns.stdDev', {
  defaultMessage: 'Std Dev',
});

export const COLUMN_MIN = i18n.translate('xpack.evals.runDetail.columns.min', {
  defaultMessage: 'Min',
});

export const COLUMN_MAX = i18n.translate('xpack.evals.runDetail.columns.max', {
  defaultMessage: 'Max',
});

export const COLUMN_COUNT = i18n.translate('xpack.evals.runDetail.columns.count', {
  defaultMessage: 'Count',
});

export const getPageTitle = (runId: string) =>
  i18n.translate('xpack.evals.runDetail.pageTitle', {
    defaultMessage: 'Run: {runId}...',
    values: { runId },
  });

export const getBreadcrumbRun = (runId: string) =>
  i18n.translate('xpack.evals.runDetail.breadcrumbRun', {
    defaultMessage: 'Run {runId}...',
    values: { runId },
  });

export const getTraceFlyoutTitle = (traceId: string) =>
  i18n.translate('xpack.evals.runDetail.traceFlyoutTitle', {
    defaultMessage: 'Trace: {traceId}',
    values: { traceId },
  });

export const getExamplesLoadError = (errorMessage: string) =>
  i18n.translate('xpack.evals.runDetail.examplesLoadError', {
    defaultMessage: 'Failed to load dataset examples: {errorMessage}',
    values: { errorMessage },
  });
