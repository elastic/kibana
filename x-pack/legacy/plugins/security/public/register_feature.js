/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import { i18n } from '@kbn/i18n';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'security',
    title: i18n.translate('xpack.security.registerFeature.securitySettingsTitle', {
      defaultMessage: 'Security Settings'
    }),
    description: i18n.translate('xpack.security.registerFeature.securitySettingsDescription', {
      defaultMessage: 'Protect your data and easily manage who has access to what with users and roles.'
    }),
    icon: 'securityApp',
    path: '/app/kibana#/management/security',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
