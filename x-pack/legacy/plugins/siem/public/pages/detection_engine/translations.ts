/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.detectionsPageTitle', {
  defaultMessage: 'Detections',
});

export const LAST_SIGNAL = i18n.translate('xpack.siem.detectionEngine.lastSignalTitle', {
  defaultMessage: 'Last signal',
});

export const TOTAL_SIGNAL = i18n.translate('xpack.siem.detectionEngine.totalSignalTitle', {
  defaultMessage: 'Total',
});

export const SIGNAL = i18n.translate('xpack.siem.detectionEngine.signalTitle', {
  defaultMessage: 'Signals (SIEM Detections)',
});

export const ALERT = i18n.translate('xpack.siem.detectionEngine.alertTitle', {
  defaultMessage: 'External alerts',
});

export const BUTTON_MANAGE_RULES = i18n.translate('xpack.siem.detectionEngine.buttonManageRules', {
  defaultMessage: 'Manage signal detection rules',
});

export const PANEL_SUBTITLE_SHOWING = i18n.translate(
  'xpack.siem.detectionEngine.panelSubtitleShowing',
  {
    defaultMessage: 'Showing',
  }
);

export const EMPTY_TITLE = i18n.translate('xpack.siem.detectionEngine.emptyTitle', {
  defaultMessage:
    'It looks like you don’t have any indices relevant to the detection engine in the SIEM application',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate(
  'xpack.siem.detectionEngine.emptyActionPrimary',
  {
    defaultMessage: 'View setup instructions',
  }
);

export const EMPTY_ACTION_SECONDARY = i18n.translate(
  'xpack.siem.detectionEngine.emptyActionSecondary',
  {
    defaultMessage: 'Go to documentation',
  }
);

export const NO_INDEX_TITLE = i18n.translate('xpack.siem.detectionEngine.noIndexTitle', {
  defaultMessage: 'Let’s set up your detection engine',
});

export const NO_INDEX_MSG_BODY = i18n.translate('xpack.siem.detectionEngine.noIndexMsgBody', {
  defaultMessage:
    'To use the detection engine, a user with the required cluster and index privileges must first access this page. For more help, contact your administrator.',
});

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.siem.detectionEngine.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);

export const USER_UNAUTHENTICATED_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.userUnauthenticatedTitle',
  {
    defaultMessage: 'Detection engine permissions required',
  }
);

export const USER_UNAUTHENTICATED_MSG_BODY = i18n.translate(
  'xpack.siem.detectionEngine.userUnauthenticatedMsgBody',
  {
    defaultMessage:
      'You do not have the required permissions for viewing the detection engine. For more help, contact your administrator.',
  }
);
