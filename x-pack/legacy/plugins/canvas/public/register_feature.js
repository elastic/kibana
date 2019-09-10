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
    id: 'canvas',
    title: 'Canvas',
    description: i18n.translate('xpack.canvas.appDescription', {
      defaultMessage: 'Showcase your data in a pixel-perfect way.',
    }),
    icon: 'canvasApp',
    path: '/app/canvas',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  };
});
