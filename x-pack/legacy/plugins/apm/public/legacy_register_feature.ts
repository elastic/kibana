/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { featureCatalogueEntry } from './new-platform/featureCatalogueEntry';

const {
  core,
  plugins: { home }
} = npSetup;
const apmUiEnabled = core.injectedMetadata.getInjectedVar(
  'apmUiEnabled'
) as boolean;

if (apmUiEnabled) {
  home.featureCatalogue.register(featureCatalogueEntry);
}

home.environment.update({
  apmUi: apmUiEnabled
});
