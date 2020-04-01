/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { featureCatalogueEntry } from './feature_catalogue_entry';

const {
  plugins: { home },
} = npSetup;

home.featureCatalogue.register(featureCatalogueEntry);
