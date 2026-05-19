/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { MaybePromise } from '@kbn/utility-types';
import type { CoreSetup, Plugin, PluginInitializerContext, IClusterClient } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingPluginStart } from './types';
/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export declare class LicensingPlugin
  implements Plugin<LicensingPluginSetup, LicensingPluginStart, {}, {}>
{
  private readonly context;
  private stop$;
  private readonly isElasticsearchAvailable$;
  private readonly logger;
  private readonly config;
  private licenseSubscription?;
  private featureUsage;
  private refresh?;
  private license$?;
  constructor(context: PluginInitializerContext);
  setup(core: CoreSetup<{}, LicensingPluginStart>): {
    refresh: () => Promise<ILicense>;
    license$: Observable<ILicense>;
    featureUsage: import('./services').FeatureUsageServiceSetup;
  };
  private createLicensePoller;
  start(): {
    refresh: () => Promise<ILicense>;
    getLicense: () => Promise<ILicense>;
    license$: Observable<ILicense>;
    featureUsage: import('./services').FeatureUsageServiceStart;
    createLicensePoller: (
      clusterClient: MaybePromise<IClusterClient>,
      pollingFrequency: number
    ) => {
      refresh: () => Promise<ILicense>;
      license$: Observable<ILicense>;
    };
  };
  stop(): void;
}
