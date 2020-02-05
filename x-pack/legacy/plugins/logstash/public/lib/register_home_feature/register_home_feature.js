/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';

import { i18n } from '@kbn/i18n';

FeatureCatalogueRegistryProvider.register($injector => {
  const licenseService = $injector.get('logstashLicenseService');
  if (!licenseService.enableLinks) {
    return;
  }

  return {
    id: 'management_logstash',
    title: i18n.translate('xpack.logstash.homeFeature.logstashPipelinesTitle', {
      defaultMessage: 'Logstash Pipelines',
    }),
    description: i18n.translate('xpack.logstash.homeFeature.logstashPipelinesDescription', {
      defaultMessage: 'Create, delete, update, and clone data ingestion pipelines.',
    }),
    icon: 'pipelineApp',
    path: '/app/kibana#/management/logstash/pipelines',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
