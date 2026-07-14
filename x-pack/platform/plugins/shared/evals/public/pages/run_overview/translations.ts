/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.evals.runOverview.title', {
  defaultMessage: 'Experiments overview',
});

export const SUBTITLE = i18n.translate('xpack.evals.runOverview.subtitle', {
  defaultMessage:
    'Each selected model runs as its own experiment. Track progress below, open an experiment to see its scores, or compare two experiments.',
});

export const SECTION_PROGRESS = i18n.translate('xpack.evals.runOverview.section.progress', {
  defaultMessage: 'Run progress',
});

export const SECTION_RESULTS = i18n.translate('xpack.evals.runOverview.section.results', {
  defaultMessage: 'Model results',
});

export const VIEW_DETAILS = i18n.translate('xpack.evals.runOverview.viewDetails', {
  defaultMessage: 'View details',
});

export const RESULTS_PENDING = i18n.translate('xpack.evals.runOverview.resultsPending', {
  defaultMessage: 'Waiting for results...',
});

export const NO_RESULTS = i18n.translate('xpack.evals.runOverview.noResults', {
  defaultMessage: 'No scores ingested',
});

export const COMPARE = i18n.translate('xpack.evals.runOverview.compare', {
  defaultMessage: 'Compare experiments',
});

export const COMPARE_PENDING_HINT = i18n.translate('xpack.evals.runOverview.comparePendingHint', {
  defaultMessage: 'Comparison is available once both models have ingested scores.',
});

export const COMPARE_HINT_MANY = i18n.translate('xpack.evals.runOverview.compareHintMany', {
  defaultMessage: 'Open the Experiments list to compare any two of these models.',
});

export const BACK_TO_EXPERIMENTS = i18n.translate('xpack.evals.runOverview.backToExperiments', {
  defaultMessage: 'Back to experiments',
});

export const EMPTY_TITLE = i18n.translate('xpack.evals.runOverview.emptyTitle', {
  defaultMessage: 'No launched runs to show',
});

export const EMPTY_BODY = i18n.translate('xpack.evals.runOverview.emptyBody', {
  defaultMessage: 'This page opens automatically after launching a run with multiple experiments.',
});

export const scoresIngested = (count: number) =>
  i18n.translate('xpack.evals.runOverview.scoresIngested', {
    defaultMessage: '{count} {count, plural, one {score} other {scores}} ingested',
    values: { count },
  });
