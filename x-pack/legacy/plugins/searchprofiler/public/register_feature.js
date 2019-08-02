/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import { i18n } from '@kbn/i18n';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'searchprofiler',
    title: i18n.translate('xpack.searchProfiler.registryProviderTitle', {
      defaultMessage: 'Search Profiler',
    }),
    description: i18n.translate('xpack.searchProfiler.registryProviderDescription', {
      defaultMessage: 'Quickly check the performance of any Elasticsearch query.',
    }),
    icon: 'searchProfilerApp',
    path: '/app/kibana#/dev_tools/searchprofiler',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
