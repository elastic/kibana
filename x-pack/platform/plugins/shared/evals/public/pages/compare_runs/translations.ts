/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.evals.compareRuns.pageTitle', {
  defaultMessage: 'Compare runs',
});

export const RUN_A_LABEL = i18n.translate('xpack.evals.compareRuns.runALabel', {
  defaultMessage: 'Run A',
});

export const RUN_B_LABEL = i18n.translate('xpack.evals.compareRuns.runBLabel', {
  defaultMessage: 'Run B',
});

export const COLUMN_DATASET = i18n.translate('xpack.evals.compareRuns.columns.dataset', {
  defaultMessage: 'Dataset',
});

export const COLUMN_EVALUATOR = i18n.translate('xpack.evals.compareRuns.columns.evaluator', {
  defaultMessage: 'Evaluator',
});

export const COLUMN_SAMPLE_SIZE = i18n.translate('xpack.evals.compareRuns.columns.sampleSize', {
  defaultMessage: 'N',
});

export const COLUMN_MEAN_A = i18n.translate('xpack.evals.compareRuns.columns.meanA', {
  defaultMessage: 'Mean A',
});

export const COLUMN_MEAN_B = i18n.translate('xpack.evals.compareRuns.columns.meanB', {
  defaultMessage: 'Mean B',
});

export const COLUMN_DIFF = i18n.translate('xpack.evals.compareRuns.columns.diff', {
  defaultMessage: 'Diff',
});

export const COLUMN_P_VALUE = i18n.translate('xpack.evals.compareRuns.columns.pValue', {
  defaultMessage: 'p-value',
});

export const COLUMN_SIGNIFICANCE = i18n.translate('xpack.evals.compareRuns.columns.significance', {
  defaultMessage: 'Significance',
});

export const BADGE_SIGNIFICANT = i18n.translate('xpack.evals.compareRuns.badgeSignificant', {
  defaultMessage: 'Significant',
});

export const BADGE_NOT_SIGNIFICANT = i18n.translate('xpack.evals.compareRuns.badgeNotSignificant', {
  defaultMessage: 'Not significant',
});

export const BADGE_INSUFFICIENT_DATA = i18n.translate(
  'xpack.evals.compareRuns.badgeInsufficientData',
  { defaultMessage: 'Insufficient data' }
);

export const SUMMARY_PAIRS = i18n.translate('xpack.evals.compareRuns.summaryPairs', {
  defaultMessage: 'Paired examples',
});

export const SUMMARY_SKIPPED_MISSING = i18n.translate(
  'xpack.evals.compareRuns.summarySkippedMissing',
  { defaultMessage: 'Skipped (no match)' }
);

export const SUMMARY_SKIPPED_NULL = i18n.translate('xpack.evals.compareRuns.summarySkippedNull', {
  defaultMessage: 'Skipped (null scores)',
});

export const SUMMARY_SIGNIFICANT_DIFFS = i18n.translate(
  'xpack.evals.compareRuns.summarySignificantDiffs',
  { defaultMessage: 'Significant differences' }
);

export const LOADING_LABEL = i18n.translate('xpack.evals.compareRuns.loadingLabel', {
  defaultMessage: 'Loading comparison...',
});

export const ERROR_TITLE = i18n.translate('xpack.evals.compareRuns.errorTitle', {
  defaultMessage: 'Unable to compare runs',
});

export const getErrorBody = (errorMessage: string) =>
  i18n.translate('xpack.evals.compareRuns.errorBody', {
    defaultMessage: 'An error occurred while comparing runs: {errorMessage}',
    values: { errorMessage },
  });

export const MISSING_RUN_IDS_TITLE = i18n.translate('xpack.evals.compareRuns.missingRunIdsTitle', {
  defaultMessage: 'Missing run IDs',
});

export const MISSING_RUN_IDS_BODY = i18n.translate('xpack.evals.compareRuns.missingRunIdsBody', {
  defaultMessage: 'Select two runs from the runs list to compare them.',
});

export const BACK_TO_RUNS = i18n.translate('xpack.evals.compareRuns.backToRuns', {
  defaultMessage: 'Back to runs',
});

export const TABLE_CAPTION = i18n.translate('xpack.evals.compareRuns.tableCaption', {
  defaultMessage: 'Comparison results by dataset and evaluator',
});

export const FLYOUT_TITLE = i18n.translate('xpack.evals.compareRuns.flyoutTitle', {
  defaultMessage: 'Per-example scores',
});

export const FLYOUT_TABLE_CAPTION = i18n.translate('xpack.evals.compareRuns.flyoutTableCaption', {
  defaultMessage: 'Per-example score comparison',
});

export const FLYOUT_COLUMN_EXAMPLE = i18n.translate(
  'xpack.evals.compareRuns.flyout.columnExample',
  { defaultMessage: 'Example' }
);

export const FLYOUT_COLUMN_SCORE_A = i18n.translate('xpack.evals.compareRuns.flyout.columnScoreA', {
  defaultMessage: 'Score A',
});

export const FLYOUT_COLUMN_SCORE_B = i18n.translate('xpack.evals.compareRuns.flyout.columnScoreB', {
  defaultMessage: 'Score B',
});

export const FLYOUT_COLUMN_DIFF = i18n.translate('xpack.evals.compareRuns.flyout.columnDiff', {
  defaultMessage: 'Diff',
});

export const FLYOUT_COLUMN_TRACES = i18n.translate('xpack.evals.compareRuns.flyout.columnTraces', {
  defaultMessage: 'Traces',
});

export const FLYOUT_TRACE_TITLE = i18n.translate('xpack.evals.compareRuns.flyout.traceTitle', {
  defaultMessage: 'Trace',
});

export const RETRY_BUTTON = i18n.translate('xpack.evals.compareRuns.retryButton', {
  defaultMessage: 'Retry',
});

export const NO_RESULTS_TITLE = i18n.translate('xpack.evals.compareRuns.noResultsTitle', {
  defaultMessage: 'No comparison results',
});

export const NO_RESULTS_BODY = i18n.translate('xpack.evals.compareRuns.noResultsBody', {
  defaultMessage: 'The two runs have no overlapping datasets or paired examples.',
});

export const STAT_TASK_MODEL = i18n.translate('xpack.evals.compareRuns.statTaskModel', {
  defaultMessage: 'Task model',
});

export const STAT_EVALUATOR_MODEL = i18n.translate('xpack.evals.compareRuns.statEvaluatorModel', {
  defaultMessage: 'Evaluator model',
});

export const STAT_TIMESTAMP = i18n.translate('xpack.evals.compareRuns.statTimestamp', {
  defaultMessage: 'Timestamp',
});

export const CLICK_ROW_HINT = i18n.translate('xpack.evals.compareRuns.clickRowHint', {
  defaultMessage: 'Click a row to view per-example score details.',
});

export const DIFF_IMPROVED = i18n.translate('xpack.evals.compareRuns.diffImproved', {
  defaultMessage: 'Improvement (Run A is better)',
});

export const DIFF_REGRESSED = i18n.translate('xpack.evals.compareRuns.diffRegressed', {
  defaultMessage: 'Regression (Run A is worse)',
});

export const DIFF_LOWER_IS_BETTER = i18n.translate('xpack.evals.compareRuns.diffLowerIsBetter', {
  defaultMessage: 'Lower is better for this metric',
});

export const DIFF_HIGHER_IS_BETTER = i18n.translate('xpack.evals.compareRuns.diffHigherIsBetter', {
  defaultMessage: 'Higher is better for this metric',
});

export const FLYOUT_UNPAIRED_HINT = i18n.translate('xpack.evals.compareRuns.flyoutUnpairedHint', {
  defaultMessage:
    'This example only exists in one run and is excluded from the statistical comparison',
});

export const FLYOUT_NO_EXAMPLES_TITLE = i18n.translate(
  'xpack.evals.compareRuns.flyoutNoExamplesTitle',
  { defaultMessage: 'No paired examples' }
);

export const FLYOUT_NO_EXAMPLES_BODY = i18n.translate(
  'xpack.evals.compareRuns.flyoutNoExamplesBody',
  { defaultMessage: 'No matching examples were found for this dataset and evaluator combination.' }
);

export const SWAP_RUNS_LABEL = i18n.translate('xpack.evals.compareRuns.swapRunsLabel', {
  defaultMessage: 'Swap run A and run B',
});

export const VIEW_RUN_DETAIL = i18n.translate('xpack.evals.compareRuns.viewRunDetail', {
  defaultMessage: 'View run details',
});

export const BADGE_NEWER = i18n.translate('xpack.evals.compareRuns.badgeNewer', {
  defaultMessage: 'Newer',
});

export const BADGE_OLDER = i18n.translate('xpack.evals.compareRuns.badgeOlder', {
  defaultMessage: 'Older',
});

export const FLYOUT_TRACE_A = i18n.translate('xpack.evals.compareRuns.flyoutTraceA', {
  defaultMessage: 'View trace (Run A)',
});

export const FLYOUT_TRACE_B = i18n.translate('xpack.evals.compareRuns.flyoutTraceB', {
  defaultMessage: 'View trace (Run B)',
});

export const EXPORT_CSV = i18n.translate('xpack.evals.compareRuns.exportCsv', {
  defaultMessage: 'Copy as CSV',
});

export const EXPORT_CSV_COPIED = i18n.translate('xpack.evals.compareRuns.exportCsvCopied', {
  defaultMessage: 'Copied!',
});

export const TRUNCATION_WARNING_TITLE = i18n.translate(
  'xpack.evals.compareRuns.truncationWarningTitle',
  { defaultMessage: 'Results may be incomplete' }
);

export const TRUNCATION_WARNING_BODY = i18n.translate(
  'xpack.evals.compareRuns.truncationWarningBody',
  {
    defaultMessage:
      'One or both runs exceeded the maximum number of scores that can be compared. The statistical results below are based on a truncated subset and may not be accurate.',
  }
);

export const EXPORT_CSV_FAILED = i18n.translate('xpack.evals.compareRuns.exportCsvFailed', {
  defaultMessage: 'Copy failed',
});
