/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';

import { getAppDescription } from '../i18n';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'canvas',
    title: 'Canvas',
    description: getAppDescription(),
    icon: 'canvasApp',
    path: '/app/canvas',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  };
});
