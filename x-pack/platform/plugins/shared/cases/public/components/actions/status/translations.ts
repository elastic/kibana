/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export { MARK_CASE_IN_PROGRESS, OPEN_CASE, CLOSE_CASE } from '../../../common/translations';

export const CLOSED_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.cases.actions.closedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Closed {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const REOPENED_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.cases.actions.reopenedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Opened {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const MARK_IN_PROGRESS_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.cases.actions.markInProgressCases', {
    values: { caseTitle, totalCases },
    defaultMessage:
      'Marked {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}} as in progress',
  });

export const BULK_ACTION_STATUS_CLOSE = i18n.translate('xpack.cases.actions.status.close', {
  defaultMessage: 'Close selected',
});

export const BULK_ACTION_STATUS_OPEN = i18n.translate('xpack.cases.actions.status.open', {
  defaultMessage: 'Open selected',
});

export const BULK_ACTION_STATUS_IN_PROGRESS = i18n.translate(
  'xpack.cases.actions.status.inProgress',
  {
    defaultMessage: 'Mark in progress',
  }
);
