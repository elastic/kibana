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
    id: 'painless_playground',
    title: i18n.translate('xpack.painlessPlayground.registryProviderTitle', {
      defaultMessage: 'Painless Playground',
    }),
    description: i18n.translate('xpack.painlessPlayground.registryProviderDescription', {
      defaultMessage: 'Simulate and debug painless code',
    }),
    icon: '',
    path: '/app/kibana#/dev_tools/painless_playground',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
