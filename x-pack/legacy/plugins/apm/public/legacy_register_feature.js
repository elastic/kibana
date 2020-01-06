/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { featureCatalogueEntry } from './new-platform/featureCatalogueEntry';

const { core } = npStart;
const apmUiEnabled = core.injectedMetadata.getInjectedVar('apmUiEnabled');

if (apmUiEnabled) {
  FeatureCatalogueRegistryProvider.register(() => featureCatalogueEntry);
}
