/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { LicenseChecker, ILicenseChecker } from '../common/license_checker';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
import { GlobalSearchClientConfigType } from './config';
import { SearchService } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchPluginSetupDeps {}
export interface GlobalSearchPluginStartDeps {
  licensing: LicensingPluginStart;
}

export class GlobalSearchPlugin
  implements
    Plugin<
      GlobalSearchPluginSetup,
      GlobalSearchPluginStart,
      GlobalSearchPluginSetupDeps,
      GlobalSearchPluginStartDeps
    >
{
  private readonly config: GlobalSearchClientConfigType;
  private licenseChecker?: ILicenseChecker;
  private readonly searchService = new SearchService();

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<GlobalSearchClientConfigType>();
  }

  setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    const { registerResultProvider } = this.searchService.setup({
      config: this.config,
    });

    return {
      registerResultProvider,
    };
  }

  start({ http }: CoreStart, { licensing }: GlobalSearchPluginStartDeps) {
    this.licenseChecker = new LicenseChecker(licensing.license$);
    const { find, getSearchableTypes } = this.searchService.start({
      http,
      licenseChecker: this.licenseChecker,
    });

    return {
      find,
      getSearchableTypes,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
