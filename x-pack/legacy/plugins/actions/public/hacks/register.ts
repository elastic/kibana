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

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'actions',
    title: 'Actions', // This is a product name so we don't translate it.
    description: i18n.translate('xpack.actions.ActionsDescription', {
      defaultMessage: 'Data by creating, managing, and monitoring actions.',
    }),
    icon: 'actionsApp',
    path: '/app/kibana#/management/elasticsearch/actions',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
