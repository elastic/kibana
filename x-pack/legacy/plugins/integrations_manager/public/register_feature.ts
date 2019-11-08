/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { PLUGIN } from '../common/constants';
import { patterns } from './routes';

// This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
if (npSetup.plugins.feature_catalogue) {
  npSetup.plugins.feature_catalogue.register({
    id: PLUGIN.ID,
    title: PLUGIN.TITLE,
    description: PLUGIN.DESCRIPTION,
    icon: PLUGIN.ICON,
    path: patterns.APP_ROOT,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  });
}
