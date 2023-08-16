/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_LICENSE_MESSAGE = (requiredLicense: string) =>
  i18n.translate('xpack.securitySolutionEss.paywall.upgradeMessage', {
    defaultMessage: 'This feature is available with {requiredLicense} or higher subscription',
    values: {
      requiredLicense,
    },
  });

export const UPGRADE_PRODUCT_MESSAGE = (requiredProduct: string) =>
  i18n.translate('xpack.securitySolutionEss.paywall.upgradeMessage', {
    defaultMessage: 'Entity Analytics is available with {requiredProduct} subscriptions',
    values: {
      requiredProduct,
    },
  });

export const UPGRADE_BUTTON = (requiredLicenseOrProduct: string) =>
  i18n.translate('xpack.securitySolutionEss.paywall.upgradeButton', {
    defaultMessage: 'Upgrade to {requiredLicenseOrProduct}',
    values: {
      requiredLicenseOrProduct,
    },
  });

export const ENTITY_ANALYTICS_LICENSE_DESC = i18n.translate(
  'xpack.securitySolutionEss.entityAnalytics.pageDesc',
  {
    defaultMessage: 'Detect threats from users and hosts within your network with Entity Analytics',
  }
);

export const ENTITY_ANALYTICS_TITLE = i18n.translate(
  'xpack.securitySolutionEss.navigation.entityAnalytics',
  {
    defaultMessage: 'Entity Analytics',
  }
);
