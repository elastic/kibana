/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.evals.compareExperiments.pageTitle', {
  defaultMessage: 'Compare experiments',
});

export const BASELINE_LABEL = i18n.translate('xpack.evals.compareExperiments.baselineLabel', {
  defaultMessage: 'Baseline',
});

export const TARGET_LABEL = i18n.translate('xpack.evals.compareExperiments.targetLabel', {
  defaultMessage: 'Target',
});

export const COLUMN_DATASET = i18n.translate('xpack.evals.compareExperiments.columns.dataset', {
  defaultMessage: 'Dataset',
});

export const COLUMN_EVALUATOR = i18n.translate('xpack.evals.compareExperiments.columns.evaluator', {
  defaultMessage: 'Evaluator',
});

export const COLUMN_SAMPLE_SIZE = i18n.translate(
  'xpack.evals.compareExperiments.columns.sampleSize',
  {
    defaultMessage: 'N',
  }
);

export const COLUMN_MEAN_A = i18n.translate('xpack.evals.compareExperiments.columns.meanA', {
  defaultMessage: 'Mean A',
});

export const COLUMN_MEAN_B = i18n.translate('xpack.evals.compareExperiments.columns.meanB', {
  defaultMessage: 'Mean B',
});

export const COLUMN_DIFF = i18n.translate('xpack.evals.compareExperiments.columns.diff', {
  defaultMessage: 'Diff',
});

export const COLUMN_P_VALUE = i18n.translate('xpack.evals.compareExperiments.columns.pValue', {
  defaultMessage: 'p-value',
});

export const COLUMN_SIGNIFICANCE = i18n.translate(
  'xpack.evals.compareExperiments.columns.significance',
  {
    defaultMessage: 'Significance',
  }
);

export const BADGE_SIGNIFICANT = i18n.translate('xpack.evals.compareExperiments.badgeSignificant', {
  defaultMessage: 'Significant',
});

export const BADGE_NOT_SIGNIFICANT = i18n.translate(
  'xpack.evals.compareExperiments.badgeNotSignificant',
  {
    defaultMessage: 'Not significant',
  }
);

export const BADGE_INSUFFICIENT_DATA = i18n.translate(
  'xpack.evals.compareExperiments.badgeInsufficientData',
  { defaultMessage: 'Insufficient data' }
);

export const SUMMARY_PAIRS = i18n.translate('xpack.evals.compareExperiments.summaryPairs', {
  defaultMessage: 'Paired examples',
});

export const SUMMARY_SKIPPED_MISSING = i18n.translate(
  'xpack.evals.compareExperiments.summarySkippedMissing',
  { defaultMessage: 'Skipped (no match)' }
);

export const SUMMARY_SKIPPED_NULL = i18n.translate(
  'xpack.evals.compareExperiments.summarySkippedNull',
  {
    defaultMessage: 'Skipped (null scores)',
  }
);

export const SUMMARY_SIGNIFICANT_DIFFS = i18n.translate(
  'xpack.evals.compareExperiments.summarySignificantDiffs',
  { defaultMessage: 'Significant differences' }
);

export const LOADING_LABEL = i18n.translate('xpack.evals.compareExperiments.loadingLabel', {
  defaultMessage: 'Loading comparison...',
});

export const ERROR_TITLE = i18n.translate('xpack.evals.compareExperiments.errorTitle', {
  defaultMessage: 'Unable to compare experiments',
});

export const getErrorBody = (errorMessage: string) =>
  i18n.translate('xpack.evals.compareExperiments.errorBody', {
    defaultMessage: 'An error occurred while comparing experiments: {errorMessage}',
    values: { errorMessage },
  });

export const MISSING_EXPERIMENT_IDS_TITLE = i18n.translate(
  'xpack.evals.compareExperiments.missingExperimentIdsTitle',
  {
    defaultMessage: 'Missing experiment IDs',
  }
);

export const MISSING_EXPERIMENT_IDS_BODY = i18n.translate(
  'xpack.evals.compareExperiments.missingExperimentIdsBody',
  {
    defaultMessage: 'Select two experiments from the experiments list to compare them.',
  }
);

export const BACK_TO_EXPERIMENTS = i18n.translate(
  'xpack.evals.compareExperiments.backToExperiments',
  {
    defaultMessage: 'Back to experiments',
  }
);

export const TABLE_CAPTION = i18n.translate('xpack.evals.compareExperiments.tableCaption', {
  defaultMessage: 'Comparison results by dataset and evaluator',
});

export const FLYOUT_TITLE = i18n.translate('xpack.evals.compareExperiments.flyoutTitle', {
  defaultMessage: 'Per-example scores',
});

export const FLYOUT_TABLE_CAPTION = i18n.translate(
  'xpack.evals.compareExperiments.flyoutTableCaption',
  {
    defaultMessage: 'Per-example score comparison',
  }
);

export const FLYOUT_COLUMN_EXAMPLE = i18n.translate(
  'xpack.evals.compareExperiments.flyout.columnExample',
  { defaultMessage: 'Example' }
);

export const FLYOUT_COLUMN_SCORE_A = i18n.translate(
  'xpack.evals.compareExperiments.flyout.columnScoreA',
  {
    defaultMessage: 'Score A',
  }
);

export const FLYOUT_COLUMN_SCORE_B = i18n.translate(
  'xpack.evals.compareExperiments.flyout.columnScoreB',
  {
    defaultMessage: 'Score B',
  }
);

export const FLYOUT_COLUMN_DIFF = i18n.translate(
  'xpack.evals.compareExperiments.flyout.columnDiff',
  {
    defaultMessage: 'Diff',
  }
);

export const FLYOUT_COLUMN_TRACES = i18n.translate(
  'xpack.evals.compareExperiments.flyout.columnTraces',
  {
    defaultMessage: 'Traces',
  }
);

export const FLYOUT_TRACE_TITLE = i18n.translate(
  'xpack.evals.compareExperiments.flyout.traceTitle',
  {
    defaultMessage: 'Trace',
  }
);

export const RETRY_BUTTON = i18n.translate('xpack.evals.compareExperiments.retryButton', {
  defaultMessage: 'Retry',
});

export const NO_RESULTS_TITLE = i18n.translate('xpack.evals.compareExperiments.noResultsTitle', {
  defaultMessage: 'No comparison results',
});

export const NO_RESULTS_BODY = i18n.translate('xpack.evals.compareExperiments.noResultsBody', {
  defaultMessage: 'The two experiments have no overlapping datasets or paired examples.',
});

export const STAT_TASK_MODEL = i18n.translate('xpack.evals.compareExperiments.statTaskModel', {
  defaultMessage: 'Task model',
});

export const STAT_EVALUATOR_MODEL = i18n.translate(
  'xpack.evals.compareExperiments.statEvaluatorModel',
  {
    defaultMessage: 'Evaluator model',
  }
);

export const STAT_TIMESTAMP = i18n.translate('xpack.evals.compareExperiments.statTimestamp', {
  defaultMessage: 'Timestamp',
});

export const CLICK_ROW_HINT = i18n.translate('xpack.evals.compareExperiments.clickRowHint', {
  defaultMessage: 'Click a row to view per-example score details.',
});

export const DIFF_IMPROVED = i18n.translate('xpack.evals.compareExperiments.diffImproved', {
  defaultMessage: 'Improvement (Experiment A is better)',
});

export const DIFF_REGRESSED = i18n.translate('xpack.evals.compareExperiments.diffRegressed', {
  defaultMessage: 'Regression (Experiment A is worse)',
});

export const DIFF_LOWER_IS_BETTER = i18n.translate(
  'xpack.evals.compareExperiments.diffLowerIsBetter',
  {
    defaultMessage: 'Lower is better for this metric',
  }
);

export const DIFF_HIGHER_IS_BETTER = i18n.translate(
  'xpack.evals.compareExperiments.diffHigherIsBetter',
  {
    defaultMessage: 'Higher is better for this metric',
  }
);

export const FLYOUT_UNPAIRED_HINT = i18n.translate(
  'xpack.evals.compareExperiments.flyoutUnpairedHint',
  {
    defaultMessage:
      'This example only exists in one experiment and is excluded from the statistical comparison',
  }
);

export const FLYOUT_NO_EXAMPLES_TITLE = i18n.translate(
  'xpack.evals.compareExperiments.flyoutNoExamplesTitle',
  { defaultMessage: 'No paired examples' }
);

export const FLYOUT_NO_EXAMPLES_BODY = i18n.translate(
  'xpack.evals.compareExperiments.flyoutNoExamplesBody',
  {
    defaultMessage: 'No matching examples were found for this dataset and evaluator combination.',
  }
);

export const SWAP_EXPERIMENTS_LABEL = i18n.translate(
  'xpack.evals.compareExperiments.swapExperimentsLabel',
  {
    defaultMessage: 'Swap experiment A and experiment B',
  }
);

export const VIEW_EXPERIMENT_DETAIL = i18n.translate(
  'xpack.evals.compareExperiments.viewExperimentDetail',
  {
    defaultMessage: 'View experiment details',
  }
);

export const BADGE_NEWER = i18n.translate('xpack.evals.compareExperiments.badgeNewer', {
  defaultMessage: 'Newer',
});

export const BADGE_OLDER = i18n.translate('xpack.evals.compareExperiments.badgeOlder', {
  defaultMessage: 'Older',
});

export const FLYOUT_TRACE_A = i18n.translate('xpack.evals.compareExperiments.flyoutTraceA', {
  defaultMessage: 'View trace (Experiment A)',
});

export const FLYOUT_TRACE_B = i18n.translate('xpack.evals.compareExperiments.flyoutTraceB', {
  defaultMessage: 'View trace (Experiment B)',
});

export const EXPORT_CSV = i18n.translate('xpack.evals.compareExperiments.exportCsv', {
  defaultMessage: 'Copy as CSV',
});

export const EXPORT_CSV_COPIED = i18n.translate('xpack.evals.compareExperiments.exportCsvCopied', {
  defaultMessage: 'Copied!',
});

export const TRUNCATION_WARNING_TITLE = i18n.translate(
  'xpack.evals.compareExperiments.truncationWarningTitle',
  { defaultMessage: 'Results may be incomplete' }
);

export const TRUNCATION_WARNING_BODY = i18n.translate(
  'xpack.evals.compareExperiments.truncationWarningBody',
  {
    defaultMessage:
      'One or both experiments exceeded the maximum number of scores that can be compared. The statistical results below are based on a truncated subset and may not be accurate.',
  }
);

export const EXPORT_CSV_FAILED = i18n.translate('xpack.evals.compareExperiments.exportCsvFailed', {
  defaultMessage: 'Copy failed',
});
