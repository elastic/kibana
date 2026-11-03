/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject, firstValueFrom, timer, type Observable } from 'rxjs';
import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';

import { createLicenseUpdate } from '../../common/license_update';
import { getLicenseFetcher } from '../license_fetcher';
import { config as licensingConfig, type LicenseConfigType } from '../licensing_config';
import {
  FeatureUsageService,
  type FeatureUsageServiceSetup,
  type FeatureUsageServiceStart,
} from '../services';
import { licensingBridge } from './bridge';

/**
 * Licensing for tasks: the real license fetcher (same `_xpack` call, normalisation and `License`
 * model as the Licensing plugin) polled like the plugin does, and the plugin's feature usage service.
 * In Kibana both come from the Licensing plugin itself (see `bridge.ts`).
 */
export interface LicensingTasksSetup {
  license$: Observable<ILicense>;
  featureUsage: FeatureUsageServiceSetup;
}

export interface LicensingTasksStart {
  getLicense: () => Promise<ILicense>;
  license$: Observable<ILicense>;
  featureUsage: FeatureUsageServiceStart;
}

class LicensingTasksPlugin implements TasksPlugin<LicensingTasksSetup, LicensingTasksStart> {
  private readonly config: LicenseConfigType;
  private readonly stop$ = new Subject<void>();
  private readonly featureUsage = new FeatureUsageService();
  private license$?: Observable<ILicense>;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = context.config.get<LicenseConfigType>();
  }

  setup(core: CoreTasksSetup): LicensingTasksSetup {
    const real = licensingBridge.getSetup();
    if (real) return real;

    const pollingFrequency = this.config.api_polling_frequency.asMilliseconds();
    const fetcher = getLicenseFetcher({
      clusterClient: core
        .getStartServices()
        .then(([coreStart]: [CoreTasksStart, unknown, unknown]) => coreStart.elasticsearch.client),
      logger: this.context.logger.get(),
      cacheDurationMs: this.config.license_cache_duration.asMilliseconds(),
      maxRetryDelay: pollingFrequency,
    });
    this.license$ = createLicenseUpdate(timer(0, pollingFrequency), this.stop$, fetcher).license$;
    return { license$: this.license$, featureUsage: this.featureUsage.setup() };
  }

  start(): LicensingTasksStart {
    const real = licensingBridge.getStart();
    if (real) return real;

    const license$ = this.license$!;
    return {
      license$,
      getLicense: () => firstValueFrom(license$),
      featureUsage: this.featureUsage.start(),
    };
  }

  stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new LicensingTasksPlugin(context);

export const config = licensingConfig;
