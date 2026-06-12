/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ILicenseChecker } from '../common/license_checker';
import { LicenseChecker } from '../common/license_checker';
import type { SearchServiceStart } from './services';
import { SearchService } from './services';
import { registerRoutes } from './routes';
import type {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchRequestHandlerContext,
} from './types';
import type { GlobalSearchConfigType } from './config';

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
  private readonly config: GlobalSearchConfigType;
  private readonly searchService = new SearchService();
  private searchServiceStart?: SearchServiceStart;
  private licenseChecker?: ILicenseChecker;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<GlobalSearchConfigType>();
  }

  public setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    const { registerResultProvider } = this.searchService.setup({
      basePath: core.http.basePath,
      config: this.config,
    });

    registerRoutes(core.http.createRouter());

    core.http.registerRouteHandlerContext<GlobalSearchRequestHandlerContext, 'globalSearch'>(
      'globalSearch',
      (_, req) => {
        return {
          find: (term, options) => this.searchServiceStart!.find(term, options, req),
          getSearchableTypes: () => this.searchServiceStart!.getSearchableTypes(req),
        };
      }
    );

    return {
      registerResultProvider,
    };
  }

  public start(core: CoreStart, { licensing }: GlobalSearchPluginStartDeps) {
    this.licenseChecker = new LicenseChecker(licensing.license$);
    this.searchServiceStart = this.searchService.start({
      core,
      licenseChecker: this.licenseChecker,
    });
    return {
      find: this.searchServiceStart.find,
      getSearchableTypes: this.searchServiceStart.getSearchableTypes,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
