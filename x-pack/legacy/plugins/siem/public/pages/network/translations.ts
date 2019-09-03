/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACEHOLDER = i18n.translate('xpack.siem.network.kqlPlaceholder', {
  defaultMessage: 'e.g. source.ip: "foo"',
});

export const PAGE_TITLE = i18n.translate('xpack.siem.network.pageTitle', {
  defaultMessage: 'Network',
});

export const EMPTY_TITLE = i18n.translate('xpack.siem.network.emptyTitle', {
  defaultMessage:
    'It looks like you don’t have any indices relevant to network in the SIEM application',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate('xpack.siem.network.emptyActionPrimary', {
  defaultMessage: 'View setup instructions',
});

export const EMPTY_ACTION_SECONDARY = i18n.translate('xpack.siem.network.emptyActionSecondary', {
  defaultMessage: 'Go to documentation',
});
