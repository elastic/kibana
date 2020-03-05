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

export const ADDED_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.actionLabel.addDescription',
  {
    defaultMessage: 'added description',
  }
);

export const EDITED_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.actionLabel.editDescription',
  {
    defaultMessage: 'edited description',
  }
);

export const ADDED_COMMENT = i18n.translate('xpack.siem.case.caseView.actionLabel.addComment', {
  defaultMessage: 'added comment',
});

export const STATUS = i18n.translate('xpack.siem.case.caseView.statusLabel', {
  defaultMessage: 'Status',
});

export const CASE_OPENED = i18n.translate('xpack.siem.case.caseView.caseOpened', {
  defaultMessage: 'Case opened',
});
