/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../../translations';

export const SHOWING_CASES = (actionDate: string, actionName: string, userName: string) =>
  i18n.translate('xpack.siem.case.caseView.actionHeadline', {
    values: {
      actionDate,
      actionName,
      userName,
    },
    defaultMessage: '{userName} {actionName} on {actionDate}',
  });

export const ADDED_DESCRIPTION = i18n.translate('xpack.siem.case.caseTable.noCases.body', {
  defaultMessage: 'added description',
});

export const ADDED_TAGS = i18n.translate('xpack.siem.case.caseTable.noCases.body', {
  defaultMessage: 'added tags',
});

export const CHANGED_STATE = i18n.translate('xpack.siem.case.caseTable.noCases.body', {
  defaultMessage: 'changed state',
});
