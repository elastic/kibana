/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Comparison Dashboard
export const PAGE_TITLE = i18n.translate('xpack.evals.comparison.pageTitle', {
  defaultMessage: 'A/B Comparison',
});

export const COLUMN_EVALUATOR = i18n.translate('xpack.evals.comparison.columns.evaluator', {
  defaultMessage: 'Evaluator',
});

export const COLUMN_VARIANT_A = i18n.translate('xpack.evals.comparison.columns.variantA', {
  defaultMessage: 'Variant A',
});

export const COLUMN_VARIANT_B = i18n.translate('xpack.evals.comparison.columns.variantB', {
  defaultMessage: 'Variant B',
});

export const COLUMN_DELTA = i18n.translate('xpack.evals.comparison.columns.delta', {
  defaultMessage: 'Delta',
});

export const COLUMN_DIRECTION = i18n.translate('xpack.evals.comparison.columns.direction', {
  defaultMessage: 'Direction',
});

export const DIRECTION_A_BETTER = i18n.translate('xpack.evals.comparison.direction.aBetter', {
  defaultMessage: 'A better',
});

export const DIRECTION_B_BETTER = i18n.translate('xpack.evals.comparison.direction.bBetter', {
  defaultMessage: 'B better',
});

export const DIRECTION_TIE = i18n.translate('xpack.evals.comparison.direction.tie', {
  defaultMessage: 'Tie',
});

export const COMPOSITE_SCORE_TITLE = i18n.translate('xpack.evals.comparison.compositeScoreTitle', {
  defaultMessage: 'Composite score comparison',
});

export const SIGNIFICANCE_LABEL = i18n.translate('xpack.evals.comparison.significance', {
  defaultMessage: 'Statistical significance',
});

export const SIGNIFICANT = i18n.translate('xpack.evals.comparison.significant', {
  defaultMessage: 'Significant',
});

export const NOT_SIGNIFICANT = i18n.translate('xpack.evals.comparison.notSignificant', {
  defaultMessage: 'Not significant',
});

export const WINNER_LABEL = i18n.translate('xpack.evals.comparison.winner', {
  defaultMessage: 'Winner',
});

export const DEPLOY_WINNER_BUTTON = i18n.translate('xpack.evals.comparison.deployWinner', {
  defaultMessage: 'Deploy winner',
});

export const SCORE_MATRIX_TITLE = i18n.translate('xpack.evals.comparison.scoreMatrix', {
  defaultMessage: 'Score matrix',
});

export const LOADING = i18n.translate('xpack.evals.comparison.loading', {
  defaultMessage: 'Loading comparison data...',
});

export const NO_COMPARISON_DATA = i18n.translate('xpack.evals.comparison.noData', {
  defaultMessage: 'No comparison data available',
});

// Pairwise Review
export const PAIRWISE_TITLE = i18n.translate('xpack.evals.comparison.pairwise.title', {
  defaultMessage: 'Pairwise review',
});

export const VARIANT_A_LABEL = i18n.translate('xpack.evals.comparison.pairwise.variantA', {
  defaultMessage: 'Variant A',
});

export const VARIANT_B_LABEL = i18n.translate('xpack.evals.comparison.pairwise.variantB', {
  defaultMessage: 'Variant B',
});

export const VOTE_A_BETTER = i18n.translate('xpack.evals.comparison.pairwise.voteA', {
  defaultMessage: 'A is Better',
});

export const VOTE_B_BETTER = i18n.translate('xpack.evals.comparison.pairwise.voteB', {
  defaultMessage: 'B is Better',
});

export const VOTE_TIE = i18n.translate('xpack.evals.comparison.pairwise.voteTie', {
  defaultMessage: 'Tie',
});

export const NOTES_LABEL = i18n.translate('xpack.evals.comparison.pairwise.notes', {
  defaultMessage: 'Notes',
});

export const SUBMIT_REVIEW_BUTTON = i18n.translate('xpack.evals.comparison.pairwise.submit', {
  defaultMessage: 'Submit review',
});

export const getVariantLabel = (name: string) =>
  i18n.translate('xpack.evals.comparison.variantLabel', {
    defaultMessage: '{name}',
    values: { name },
  });
