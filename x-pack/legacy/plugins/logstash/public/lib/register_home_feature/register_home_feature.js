/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(($injector, i18n) => {

  const licenseService = $injector.get('logstashLicenseService');
  if (!licenseService.enableLinks) {
    return;
  }

  return {
    id: 'management_logstash',
    title: i18n('xpack.logstash.homeFeature.logstashPipelinesTitle', {
      defaultMessage: 'Logstash Pipelines',
    }),
    description: i18n('xpack.logstash.homeFeature.logstashPipelinesDescription', {
      defaultMessage: 'Create, delete, update, and clone data ingestion pipelines.',
    }),
    icon: 'pipelineApp',
    path: '/app/kibana#/management/logstash/pipelines',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
