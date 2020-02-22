/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_TITLE = i18n.translate('xpack.siem.pages.common.emptyTitle', {
  defaultMessage: 'Welcome to SIEM. Let’s get you started.',
});

export const EMPTY_MESSAGE = i18n.translate('xpack.siem.pages.common.emptyMessage', {
  defaultMessage:
    'To begin using security information and event management (SIEM), you’ll need to add SIEM-related data, in Elastic Common Schema (ECS) format, to the Elastic Stack. An easy way to get started is by installing and configuring our data shippers, called Beats. Let’s do that now!',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate('xpack.siem.pages.common.emptyActionPrimary', {
  defaultMessage: 'Add data with Beats',
});

export const EMPTY_ACTION_SECONDARY = i18n.translate(
  'xpack.siem.pages.common.emptyActionSecondary',
  {
    defaultMessage: 'View getting started guide',
  }
);
