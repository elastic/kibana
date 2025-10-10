/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  AutomaticImportPluginCoreSetupDependencies,
  AutomaticImportPluginSetup,
  AutomaticImportPluginSetupDependencies,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
  AutomaticImportPluginRequestHandlerContext,
} from './types';
import { RequestContextFactory } from './request_context_factory';
import { FeatureFlagAutomaticImportV2Enabled } from '../common/feature_flags';

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
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  /**
   * Setup the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginSetup
   */
  public setup(
    core: AutomaticImportPluginCoreSetupDependencies,
    plugins: AutomaticImportPluginSetupDependencies
  ) {
    this.logger.debug('automaticImportV2: Setup');

    const automaticImportV2FeatureEnabled = core.getStartServices().then(async ([coreStart]) => {
      const enabled = await coreStart.featureFlags.getBooleanValue(
        FeatureFlagAutomaticImportV2Enabled,
        false
      );
      return enabled;
    });

    Promise.all([automaticImportV2FeatureEnabled]).then(([enabled]) => {
      if (!enabled) {
        this.logger.debug('automaticImportV2: Feature flag is disabled, skipping setup');
        return;
      }
    });

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
    });

    core.http.registerRouteHandlerContext<
      AutomaticImportPluginRequestHandlerContext,
      'automaticImportv2'
    >('automaticImportv2', (context, request) => requestContextFactory.create(context, request));

    this.logger.debug('automaticImportV2: Setup complete');
    return {
      actions: plugins.actions,
    };
  }

  /**
   * Start the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginStart
   */
  public start(
    core: CoreStart,
    plugins: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    this.logger.debug('automaticImportV2: Started');
    return {
      actions: plugins.actions,
      inference: plugins.inference,
      licensing: plugins.licensing,
      security: plugins.security,
    };
  }

  /**
   * Stop the plugin
   */
  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
