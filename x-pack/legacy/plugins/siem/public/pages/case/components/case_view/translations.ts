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

export const ADDED_FIELD = i18n.translate('xpack.siem.case.caseView.actionLabel.addedField', {
  defaultMessage: 'added',
});

export const CHANGED_FIELD = i18n.translate('xpack.siem.case.caseView.actionLabel.changededField', {
  defaultMessage: 'changed',
});

export const EDITED_FIELD = i18n.translate('xpack.siem.case.caseView.actionLabel.editedField', {
  defaultMessage: 'edited',
});

export const REMOVED_FIELD = i18n.translate('xpack.siem.case.caseView.actionLabel.removedField', {
  defaultMessage: 'removed',
});

export const ADDED_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.actionLabel.addDescription',
  {
    defaultMessage: 'added description',
  }
);

export const EDIT_DESCRIPTION = i18n.translate('xpack.siem.case.caseView.edit.description', {
  defaultMessage: 'Edit description',
});

export const EDIT_COMMENT = i18n.translate('xpack.siem.case.caseView.edit.comment', {
  defaultMessage: 'Edit comment',
});

export const ON = i18n.translate('xpack.siem.case.caseView.actionLabel.on', {
  defaultMessage: 'on',
});

export const ADDED_COMMENT = i18n.translate('xpack.siem.case.caseView.actionLabel.addComment', {
  defaultMessage: 'added comment',
});

export const STATUS = i18n.translate('xpack.siem.case.caseView.statusLabel', {
  defaultMessage: 'Status',
});

export const CASE = i18n.translate('xpack.siem.case.caseView.case', {
  defaultMessage: 'case',
});

export const COMMENT = i18n.translate('xpack.siem.case.caseView.comment', {
  defaultMessage: 'comment',
});

export const CASE_OPENED = i18n.translate('xpack.siem.case.caseView.caseOpened', {
  defaultMessage: 'Case opened',
});

export const CASE_CLOSED = i18n.translate('xpack.siem.case.caseView.caseClosed', {
  defaultMessage: 'Case closed',
});

export const EMAIL_SUBJECT = (caseTitle: string) =>
  i18n.translate('xpack.siem.case.caseView.emailSubject', {
    values: { caseTitle },
    defaultMessage: 'SIEM Case - {caseTitle}',
  });

export const EMAIL_BODY = (caseUrl: string) =>
  i18n.translate('xpack.siem.case.caseView.emailBody', {
    values: { caseUrl },
    defaultMessage: 'Case reference: {caseUrl}',
  });

export const PUSH_SERVICENOW = i18n.translate('xpack.siem.case.caseView.pushAsServicenowIncident', {
  defaultMessage: 'Push as ServiceNow incident',
});

export const UPDATE_PUSH_SERVICENOW = i18n.translate(
  'xpack.siem.case.caseView.updatePushAsServicenowIncident',
  {
    defaultMessage: 'Update ServiceNow incident',
  }
);

export const PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByNoCaseConfigTitle',
  {
    defaultMessage: 'Configure case',
  }
);

export const PUSH_DISABLE_BY_NO_CASE_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByNoCaseConfigDescription',
  {
    defaultMessage: 'You did not configure you case system',
  }
);

export const PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableBecauseCaseClosedTitle',
  {
    defaultMessage: 'Case closed',
  }
);

export const PUSH_DISABLE_BECAUSE_CASE_CLOSED_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableBecauseCaseClosedDescription',
  {
    defaultMessage: 'You cannot push a case who have been closed',
  }
);

export const PUSH_DISABLE_BY_KIBANA_CONFIG_TITLE = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByConfigTitle',
  {
    defaultMessage: 'Connector kibana config',
  }
);

export const PUSH_DISABLE_BY_KIBANA_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByConfigDescription',
  {
    defaultMessage: 'ServiceNow connector have been disabled in kibana config',
  }
);

export const PUSH_DISABLE_BY_LICENSE_TITLE = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByLicenseTitle',
  {
    defaultMessage: 'Elastic Stack subscriptions',
  }
);

export const PUSH_DISABLE_BY_LICENSE_DESCRIPTION = i18n.translate(
  'xpack.siem.case.caseView.pushToServiceDisableByLicenseDescription',
  {
    defaultMessage: 'ServiceNow is disabled because you do not have the right license',
  }
);
