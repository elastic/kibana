/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureCatalogueEntry } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';

import { getSpacesFeatureDescription } from './constants';

export const createSpacesFeatureCatalogueEntry = (): FeatureCatalogueEntry => {
  return {
    id: 'spaces',
    title: i18n.translate('xpack.spaces.spacesTitle', {
      defaultMessage: 'Spaces',
    }),
    description: getSpacesFeatureDescription(),
    icon: 'spacesApp',
    path: '/app/management/kibana/spaces',
    showOnHomePage: false,
    category: 'admin',
  };
};
