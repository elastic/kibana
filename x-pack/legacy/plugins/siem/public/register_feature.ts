/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';

const APP_ID = 'siem';

FeatureCatalogueRegistryProvider.register(() => ({
  id: 'siem',
  title: 'SIEM',
  description: 'Explore security metrics and logs for events and alerts',
  icon: 'securityAnalyticsApp',
  path: `/app/${APP_ID}`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
}));
