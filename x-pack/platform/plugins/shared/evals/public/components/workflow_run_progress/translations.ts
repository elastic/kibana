/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.evals.runProgress.cancel', {
  defaultMessage: 'Cancel run',
});

export const CANCEL_ERROR = i18n.translate('xpack.evals.runProgress.cancelError', {
  defaultMessage: 'Failed to cancel run',
});

export const datasetCounts = (values: {
  done: number;
  total: number | string;
  failed: number;
  scores: number;
}) =>
  i18n.translate('xpack.evals.runProgress.datasetCounts', {
    defaultMessage: '{done} / {total} examples · {failed} failed · {scores} scores ingested',
    values,
  });

export const viewFailures = (count: number) =>
  i18n.translate('xpack.evals.runProgress.viewFailures', {
    defaultMessage: 'View {count, plural, one {# failure} other {# failures}}',
    values: { count },
  });

export const loadError = (id: string) =>
  i18n.translate('xpack.evals.runProgress.loadError', {
    defaultMessage: 'Could not load execution {id}',
    values: { id },
  });

export const stepFailed = (stepId: string) =>
  i18n.translate('xpack.evals.runProgress.stepFailed', {
    defaultMessage: 'Step "{stepId}" failed',
    values: { stepId },
  });
