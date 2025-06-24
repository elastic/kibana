/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import { MINIMUM_LICENSE_TYPE } from '../common/constants';
import { registerRoutes } from './routes';
import type {
  AutomaticImportPluginSetup,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
  AutomaticImportPluginSetupDependencies,
} from './types';

export type AutomaticImportRouteHandlerContext = CustomRequestHandlerContext<{
  automaticImport: {
    getStartServices: CoreSetup<
      AutomaticImportPluginStartDependencies,
      AutomaticImportPluginStart
    >['getStartServices'];
    isAvailable: () => boolean;
    logger: Logger;
  };
}>;

export class AutomaticImportPlugin
  implements
    Plugin<
      AutomaticImportPluginSetup,
      AutomaticImportPluginStart,
      AutomaticImportPluginSetupDependencies,
      AutomaticImportPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private isAvailable: boolean;
  private hasLicense: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isAvailable = true;
    this.hasLicense = false;
  }

  public setup(
    core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportPluginStart>
  ): AutomaticImportPluginSetup {
    core.http.registerRouteHandlerContext<AutomaticImportRouteHandlerContext, 'automaticImport'>(
      'automaticImport',
      () => ({
        getStartServices: core.getStartServices,
        isAvailable: () => this.isAvailable && this.hasLicense,
        logger: this.logger,
      })
    );
    const router = core.http.createRouter<AutomaticImportRouteHandlerContext>();

    this.logger.debug('automaticImport api: Setup');

    registerRoutes(router);

    return {
      setIsAvailable: (isAvailable: boolean) => {
        if (!isAvailable) {
          this.isAvailable = false;
        }
      },
    };
  }

  public start(
    _: CoreStart,
    dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    this.logger.debug('automaticImport api: Started');
    const { licensing } = dependencies;

    licensing.license$.subscribe((license) => {
      this.hasLicense = license.hasAtLeast(MINIMUM_LICENSE_TYPE);
    });

    return {};
  }

  public stop() {}
}
