/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
  FeatureFlagsStart,
} from '@kbn/core/server';

import { ReplaySubject, type Subject, exhaustMap, takeWhile, takeUntil } from 'rxjs';
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

interface FeatureFlagDefinition {
  featureFlagName: string;
  fallbackValue: boolean;
  /**
   * Function to execute when the feature flag is evaluated.
   * @param enabled If the feature flag is enabled or not.
   * @return `true` if susbscription needs to stay active, `false` if it can be unsubscribed.
   */
  fn: (enabled: boolean) => boolean | Promise<boolean>;
}

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

    const featureFlagDefinitions: FeatureFlagDefinition[] = [
      {
        featureFlagName: FeatureFlagAutomaticImportV2Enabled,
        fallbackValue: false,
        fn: (enabled) => {
          return enabled;
        },
      },
    ];

    core
      .getStartServices()
      .then(([{ featureFlags }]) => this.evaluateFeatureFlags(featureFlagDefinitions, featureFlags))
      .catch((error) => {
        this.logger.error(`error in automatic import v2 plugin setup: ${error}`);
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

  private evaluateFeatureFlags(
    featureFlagDefinitions: FeatureFlagDefinition[],
    featureFlags: FeatureFlagsStart
  ) {
    featureFlagDefinitions.forEach(({ featureFlagName, fallbackValue, fn }) => {
      featureFlags
        .getBooleanValue$(featureFlagName, fallbackValue)
        .pipe(
          takeUntil(this.pluginStop$),
          exhaustMap(async (enabled) => {
            let continueSubscription = true;
            try {
              continueSubscription = await fn(enabled);
            } catch (error) {
              this.logger.error(
                `Error during setup based on feature flag ${featureFlagName}: ${error}`
              );
            }
            return continueSubscription;
          }),
          takeWhile((continueSubscription) => continueSubscription)
        )
        .subscribe();
    });
  }
}
