/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_CAPTION = i18n.translate('xpack.evals.experimentsList.tableCaption', {
  defaultMessage: 'Evaluation experiments',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.evals.experimentsList.searchPlaceholder', {
  defaultMessage: 'Filter by branch...',
});

export const COLUMN_NAME = i18n.translate('xpack.evals.experimentsList.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_TIMESTAMP = i18n.translate('xpack.evals.experimentsList.columns.timestamp', {
  defaultMessage: 'Timestamp',
});

export const COLUMN_TASK_MODEL = i18n.translate('xpack.evals.experimentsList.columns.taskModel', {
  defaultMessage: 'Task Model',
});

export const COLUMN_EVALUATOR_MODEL = i18n.translate(
  'xpack.evals.experimentsList.columns.evaluatorModel',
  { defaultMessage: 'Evaluator Model' }
);

export const COLUMN_BRANCH = i18n.translate('xpack.evals.experimentsList.columns.branch', {
  defaultMessage: 'Branch',
});

export const COLUMN_REPS = i18n.translate('xpack.evals.experimentsList.columns.reps', {
  defaultMessage: 'Reps',
});

export const COLUMN_CI = i18n.translate('xpack.evals.experimentsList.columns.ci', {
  defaultMessage: 'CI',
});

export const COLUMN_PULL_REQUEST = i18n.translate(
  'xpack.evals.experimentsList.columns.pullRequest',
  {
    defaultMessage: 'PR',
  }
);

export const CI_BUILD_LINK = i18n.translate('xpack.evals.experimentsList.ciBuildLink', {
  defaultMessage: 'Build',
});

export const PR_LINK = i18n.translate('xpack.evals.experimentsList.prLink', {
  defaultMessage: 'PR',
});

export const SUITE_FILTER_ARIA_LABEL = i18n.translate(
  'xpack.evals.experimentsList.suiteFilterAriaLabel',
  {
    defaultMessage: 'Filter experiments by suite',
  }
);

export const SUITE_FILTER_ALL_OPTION = i18n.translate(
  'xpack.evals.experimentsList.suiteFilterAllOption',
  {
    defaultMessage: 'All suites',
  }
);

export const LOAD_ERROR_TITLE = i18n.translate('xpack.evals.experimentsList.loadErrorTitle', {
  defaultMessage: 'Unable to load experiments',
});

export const getLoadErrorBody = (errorMessage: string) =>
  i18n.translate('xpack.evals.experimentsList.loadErrorBody', {
    defaultMessage: 'An error occurred while loading experiments: {errorMessage}',
    values: { errorMessage },
  });

export const RETRY_BUTTON = i18n.translate('xpack.evals.experimentsList.retryButton', {
  defaultMessage: 'Retry',
});

export const COMPARE_SELECTED_BUTTON = i18n.translate(
  'xpack.evals.experimentsList.compareSelectedButton',
  {
    defaultMessage: 'Compare selected',
  }
);

export const COMPARE_SELECTION_HINT = i18n.translate(
  'xpack.evals.experimentsList.compareSelectionHint',
  {
    defaultMessage: 'Select exactly 2 experiments from the same suite to compare',
  }
);

export const COMPARE_DIFFERENT_SUITE_HINT = i18n.translate(
  'xpack.evals.experimentsList.compareDifferentSuiteHint',
  { defaultMessage: 'Only experiments from the same suite can be compared' }
);

export const COMPARE_MAX_SELECTED_HINT = i18n.translate(
  'xpack.evals.experimentsList.compareMaxSelectedHint',
  {
    defaultMessage: '2 experiments already selected - deselect one to pick a different experiment',
  }
);

export const COLUMN_EXPERIMENTS = i18n.translate(
  'xpack.evals.experimentsList.columns.experiments',
  { defaultMessage: 'Experiments' }
);

export const getExperimentsBadge = (count: number) =>
  i18n.translate('xpack.evals.experimentsList.experimentsBadge', {
    defaultMessage: '{count, plural, one {experiment} other {experiments}}',
    values: { count },
  });
