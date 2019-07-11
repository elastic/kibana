/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryFunction,
} from 'ui/registry/feature_catalogue';
import { getSpacesFeatureDescription } from './lib/constants';

export const createSpacesFeatureCatalogueEntry: FeatureCatalogueRegistryFunction = i18n => {
  return {
    id: 'spaces',
    title: i18n('xpack.spaces.spacesTitle', {
      defaultMessage: 'Spaces',
    }),
    description: getSpacesFeatureDescription(),
    icon: 'spacesApp',
    path: '/app/kibana#/management/spaces/list',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
};
