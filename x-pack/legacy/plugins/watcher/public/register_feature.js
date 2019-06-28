/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { i18n } from '@kbn/i18n';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'watcher',
    title: 'Watcher', // This is a product name so we don't translate it.
    description: i18n.translate('xpack.watcher.watcherDescription', {
      defaultMessage: 'Detect changes in your data by creating, managing, and monitoring alerts.'
    }),
    icon: 'watchesApp',
    path: '/app/kibana#/management/elasticsearch/watcher/watches',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
