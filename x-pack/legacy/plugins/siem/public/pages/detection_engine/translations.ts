/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.pageTitle', {
  defaultMessage: 'Detection engine',
});

export const LAST_SIGNAL = i18n.translate('xpack.siem.detectionEngine.lastSignaltitle', {
  defaultMessage: 'Last signal:',
});

export const TOTAL_SIGNAL = i18n.translate('xpack.siem.detectionEngine.totalSignaltitle', {
  defaultMessage: 'Total',
});

export const SIGNAL = i18n.translate('xpack.siem.detectionEngine.signaltitle', {
  defaultMessage: 'Signals',
});

export const BUTTON_MANAGE_RULES = i18n.translate('xpack.siem.detectionEngine.buttonManageRules', {
  defaultMessage: 'Manage rules',
});

export const PANEL_SUBTITLE_SHOWING = i18n.translate(
  'xpack.siem.detectionEngine.panelSubtitleShowing',
  {
    defaultMessage: 'Showing',
  }
);

export const EMPTY_TITLE = i18n.translate('xpack.siem.detectionEngine.emptyTitle', {
  defaultMessage:
    'It looks like you don’t have any indices relevant to the detction engine in the SIEM application',
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
