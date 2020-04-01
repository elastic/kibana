/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_NEWS_MESSAGE = i18n.translate('xpack.siem.newsFeed.noNewsMessage', {
  defaultMessage:
    'Your current news feed URL returned no recent news. You may update the URL or disable security news via',
});

export const ADVANCED_SETTINGS_LINK_TITLE = i18n.translate(
  'xpack.siem.newsFeed.advancedSettingsLinkTitle',
  {
    defaultMessage: 'SIEM advanced settings',
  }
);
