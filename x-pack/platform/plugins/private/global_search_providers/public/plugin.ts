/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import { createApplicationResultProvider } from './providers';

export interface GlobalSearchProvidersPluginSetupDeps {
  globalSearch: GlobalSearchPluginSetup;
}

export class GlobalSearchProvidersPlugin
  implements Plugin<{}, {}, GlobalSearchProvidersPluginSetupDeps, {}>
{
  setup(
    { getStartServices }: CoreSetup<{}, {}>,
    { globalSearch }: GlobalSearchProvidersPluginSetupDeps
  ) {
    const startServices = getStartServices();
    const applicationPromise = startServices.then(([core]) => core.application);
    const getChromeStylePromise = startServices.then(
      ([core]) => () => core.chrome.getChromeStyle()
    );
    globalSearch.registerResultProvider(
      createApplicationResultProvider(applicationPromise, getChromeStylePromise)
    );
    return {};
  }

  start() {
    return {};
  }
}
