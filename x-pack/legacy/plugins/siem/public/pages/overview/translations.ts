/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.overview.pageTitle', {
  defaultMessage: 'SIEM',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.siem.overview.pageSubtitle', {
  defaultMessage: 'Security Information & Event Management with the Elastic Stack',
});

export const PAGE_BADGE_LABEL = i18n.translate('xpack.siem.overview.pageBadgeLabel', {
  defaultMessage: 'Beta',
});

export const PAGE_BADGE_TOOLTIP = i18n.translate('xpack.siem.overview.pageBadgeTooltip', {
  defaultMessage:
    'SIEM is still in beta. Please help us improve by reporting issues or bugs in the Kibana repo.',
});

export const EMPTY_TITLE = i18n.translate('xpack.siem.overview.emptyTitle', {
  defaultMessage: 'It looks like you don’t have any indices relevant to the SIEM application',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate('xpack.siem.overview.emptyActionPrimary', {
  defaultMessage: 'View setup instructions',
});

export const EMPTY_ACTION_SECONDARY = i18n.translate('xpack.siem.overview.emptyActionSecondary', {
  defaultMessage: 'Go to documentation',
});
