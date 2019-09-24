/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { Plugin as DataPublicPlugin } from '../../../../../src/plugins/data/public';

// @ts-ignore
import { kueryProvider } from './autocomplete_providers';

/** @internal */
export interface KueryAutocompletePluginSetupDependencies {
  data: ReturnType<DataPublicPlugin['setup']>;
}

const KUERY_LANGUAGE_NAME = 'kuery';

/** @internal */
export class KueryAutocompletePlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(core: CoreSetup, { data }: KueryAutocompletePluginSetupDependencies) {
    data.autocomplete.addProvider(KUERY_LANGUAGE_NAME, kueryProvider);
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
