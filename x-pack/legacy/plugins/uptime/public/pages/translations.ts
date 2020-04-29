/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const settings = {
  breadcrumbText: i18n.translate('xpack.uptime.settingsBreadcrumbText', {
    defaultMessage: 'Settings',
  }),
  editNoticeTitle: i18n.translate('xpack.uptime.settings.cannotEditTitle', {
    defaultMessage: 'You do not have permission to edit settings.',
  }),
  editNoticeText: i18n.translate('xpack.uptime.settings.cannotEditText', {
    defaultMessage:
      "Your user currently has 'Read' permissions for the Uptime app. Enable a permissions-level of 'All' to edit these settings.",
  }),
  returnToOverviewLinkLabel: i18n.translate('xpack.uptime.settings.returnToOverviewLinkLabel', {
    defaultMessage: 'Return to overview',
  }),
};
