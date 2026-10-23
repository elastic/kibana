/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const authenticationStrings = {
  title: i18n.translate('xpack.dataFederation.createFlyout.authentication.title', {
    defaultMessage: 'Authentication',
  }),

  preferredMethodLabel: i18n.translate('xpack.dataFederation.createFlyout.authentication.label', {
    defaultMessage: 'Preferred method',
  }),

  recommendedBadge: i18n.translate('xpack.dataFederation.createFlyout.authentication.recommended', {
    defaultMessage: 'Recommended',
  }),

  learnMore: i18n.translate('xpack.dataFederation.createFlyout.authentication.learnMore', {
    defaultMessage: 'Learn more',
  }),
};
