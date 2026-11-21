/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_CAPTION = i18n.translate('xpack.evals.reviewQueues.list.tableCaption', {
  defaultMessage: 'Review queues',
});
export const NAME_COLUMN = i18n.translate('xpack.evals.reviewQueues.list.nameColumn', {
  defaultMessage: 'Name',
});
export const EVALUATOR_COLUMN = i18n.translate('xpack.evals.reviewQueues.list.evaluatorColumn', {
  defaultMessage: 'Evaluator',
});
export const SOURCE_COLUMN = i18n.translate('xpack.evals.reviewQueues.list.sourceColumn', {
  defaultMessage: 'Source',
});
export const PROGRESS_COLUMN = i18n.translate('xpack.evals.reviewQueues.list.progressColumn', {
  defaultMessage: 'Reviewed',
});
export const CREATED_COLUMN = i18n.translate('xpack.evals.reviewQueues.list.createdColumn', {
  defaultMessage: 'Created',
});
export const SOURCE_EXPERIMENT = i18n.translate('xpack.evals.reviewQueues.list.sourceExperiment', {
  defaultMessage: 'Experiment',
});
export const SOURCE_ONLINE = i18n.translate('xpack.evals.reviewQueues.list.sourceOnline', {
  defaultMessage: 'Online',
});
export const EMPTY_TITLE = i18n.translate('xpack.evals.reviewQueues.list.emptyTitle', {
  defaultMessage: 'No review queues yet',
});
export const EMPTY_BODY = i18n.translate('xpack.evals.reviewQueues.list.emptyBody', {
  defaultMessage:
    'A review queue samples scored traces so a person can label them and measure how often the judge agrees.',
});
export const LOAD_ERROR_TITLE = i18n.translate('xpack.evals.reviewQueues.list.loadErrorTitle', {
  defaultMessage: 'Unable to load review queues',
});
export const RETRY = i18n.translate('xpack.evals.reviewQueues.list.retry', {
  defaultMessage: 'Retry',
});

export const getProgress = (reviewed: number, total: number) =>
  i18n.translate('xpack.evals.reviewQueues.list.progress', {
    defaultMessage: '{reviewed} of {total}',
    values: { reviewed, total },
  });

export const getEvaluatorLabel = (name: string, version: string) =>
  i18n.translate('xpack.evals.reviewQueues.list.evaluatorLabel', {
    defaultMessage: '{name} ({version})',
    values: { name, version },
  });
