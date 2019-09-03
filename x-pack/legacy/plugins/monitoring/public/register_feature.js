/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

if (chrome.getInjected('monitoringUiEnabled')) {
  FeatureCatalogueRegistryProvider.register(() => {
    return {
      id: 'monitoring',
      title: i18n.translate('xpack.monitoring.monitoringTitle', {
        defaultMessage: 'Monitoring'
      }),
      description: i18n.translate('xpack.monitoring.monitoringDescription', {
        defaultMessage: 'Track the real-time health and performance of your Elastic Stack.'
      }),
      icon: 'monitoringApp',
      path: '/app/monitoring',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN
    };
  });
}
