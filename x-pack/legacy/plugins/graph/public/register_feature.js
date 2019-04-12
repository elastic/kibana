/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register((i18n) => {
  return {
    id: 'graph',
    title: 'Graph',
    description: i18n('xpack.graph.pluginDescription', {
      defaultMessage: 'Surface and analyze relevant relationships in your Elasticsearch data.',
    }),
    icon: 'graphApp',
    path: '/app/graph',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
