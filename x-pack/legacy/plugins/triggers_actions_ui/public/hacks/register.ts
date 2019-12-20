/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'triggersActions',
    title: 'Alerts and Actions', // This is a product name so we don't translate it.
    description: i18n.translate('xpack.triggersActionsUI.triggersActionsDescription', {
      defaultMessage: 'Data by creating, managing, and monitoring triggers and actions.',
    }),
    icon: 'triggersActionsApp',
    path: '/app/kibana#/management/kibana/triggersActions',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
