/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = i18n.translate('xpack.siem.containers.case.errorTitle', {
  defaultMessage: 'Error fetching data',
});

export const ERROR_DELETING = i18n.translate('xpack.siem.containers.case.errorDeletingTitle', {
  defaultMessage: 'Error deleting data',
});

export const UPDATED_CASE = (caseTitle: string) =>
  i18n.translate('xpack.siem.containers.case.updatedCase', {
    values: { caseTitle },
    defaultMessage: 'Updated "{caseTitle}"',
  });

export const DELETED_CASES = (totalCases: number, caseTitle?: string) =>
  i18n.translate('xpack.siem.containers.case.deletedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Deleted {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const CLOSED_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.siem.containers.case.closedCases', {
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
  i18n.translate('xpack.siem.containers.case.reopenedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Reopened {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const TAG_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.case.tagFetchFailDescription',
  {
    defaultMessage: 'Failed to fetch Tags',
  }
);

export const SUCCESS_SEND_TO_EXTERNAL_SERVICE = i18n.translate(
  'xpack.siem.containers.case.pushToExterService',
  {
    defaultMessage: 'Successfully sent to ServiceNow',
  }
);

export const ERROR_PUSH_TO_SERVICE = i18n.translate(
  'xpack.siem.case.configure.errorPushingToService',
  {
    defaultMessage: 'Error pushing to service',
  }
);
