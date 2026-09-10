/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subject, Subscription } from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  filter,
  throttleTime,
  distinctUntilChanged,
  ReplaySubject,
  timer,
  firstValueFrom,
} from 'rxjs';
import moment from 'moment';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  CoreSetup,
  Logger,
  Plugin,
  PluginInitializerContext,
  IClusterClient,
} from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import { registerAnalyticsContextProvider } from '../common/register_analytics_context_provider';
import type { LicensingPluginSetup, LicensingPluginStart } from './types';
import { createLicenseUpdate } from '../common/license_update';
import { registerRoutes } from './routes';
import { FeatureUsageService } from './services';
import type { LicenseConfigType } from './licensing_config';
import { createRouteHandlerContext } from './licensing_route_handler_context';
import { createOnPreResponseHandler } from './on_pre_response_handler';
import { getPluginStatus$ } from './plugin_status';
import { getLicenseFetcher } from './license_fetcher';

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class LicensingPlugin implements Plugin<LicensingPluginSetup, LicensingPluginStart, {}, {}> {
  private stop$: Subject<void> = new ReplaySubject<void>(1);
  private readonly isElasticsearchAvailable$ = new ReplaySubject<boolean>(1);
  private readonly logger: Logger;
  private readonly config: LicenseConfigType;
  private licenseSubscription?: Subscription;
  private featureUsage = new FeatureUsageService();

  private refresh?: () => Promise<ILicense>;
  private license$?: Observable<ILicense>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config = this.context.config.get<LicenseConfigType>();
  }

  public setup(core: CoreSetup<{}, LicensingPluginStart>) {
    this.logger.debug('Setting up Licensing plugin');
    const pollingFrequency = this.config.api_polling_frequency;

    const clientPromise = core.getStartServices().then(([{ elasticsearch }]) => {
      return elasticsearch.client;
    });

    core.status.core$
      .pipe(map(({ elasticsearch }) => elasticsearch.level === ServiceStatusLevels.available))
      .subscribe(this.isElasticsearchAvailable$);

    const { refresh, license$ } = this.createLicensePoller(
      clientPromise,
      pollingFrequency.asMilliseconds()
    );

    registerAnalyticsContextProvider(core.analytics, license$);

    core.status.set(getPluginStatus$(license$, this.stop$.asObservable()));

    core.http.registerRouteHandlerContext(
      'licensing',
      createRouteHandlerContext(license$, core.getStartServices)
    );

    const featureUsageSetup = this.featureUsage.setup();

    registerRoutes(core.http.createRouter(), featureUsageSetup, core.getStartServices);
    core.http.registerOnPreResponse(createOnPreResponseHandler(refresh, license$));

    this.refresh = refresh;
    this.license$ = license$;

    return {
      refresh,
      license$,
      featureUsage: featureUsageSetup,
    };
  }

  private createLicensePoller(
    clusterClient: MaybePromise<IClusterClient>,
    pollingFrequency: number
  ) {
    this.logger.debug(`Polling Elasticsearch License API with frequency ${pollingFrequency}ms.`);

    const isElasticsearchNotAvailable$ = this.isElasticsearchAvailable$.pipe(
      filter((isElasticsearchAvailable) => !isElasticsearchAvailable)
    );

    // Trigger whenever the timer ticks or ES becomes available
    const intervalRefresh$ = this.isElasticsearchAvailable$.pipe(
      distinctUntilChanged(),
      filter((isElasticsearchAvailable) => isElasticsearchAvailable),
      switchMap(() => timer(0, pollingFrequency).pipe(takeUntil(isElasticsearchNotAvailable$))),
      throttleTime(pollingFrequency) // avoid triggering too often
    );

    const licenseFetcher = getLicenseFetcher({
      clusterClient,
      logger: this.logger,
      cacheDurationMs: this.config.license_cache_duration.asMilliseconds(),
      maxRetryDelay: pollingFrequency,
    });

    const { license$, refreshManually } = createLicenseUpdate(
      intervalRefresh$,
      this.stop$,
      licenseFetcher
    );

    this.licenseSubscription = license$.subscribe((license) => {
      this.logger.debug(
        () =>
          'Imported license information from Elasticsearch:' +
          [
            `type: ${license.type}`,
            `status: ${license.status}`,
            `expiry date: ${moment(license.expiryDateInMillis, 'x').format()}`,
          ].join(' | ')
      );
    });

    return {
      refresh: async () => {
        this.logger.debug('Requesting Elasticsearch licensing API');
        return await refreshManually();
      },
      license$,
    };
  }

  public start() {
    if (!this.refresh || !this.license$) {
      throw new Error('Setup has not been completed');
    }
    return {
      refresh: this.refresh,
      getLicense: async () => await firstValueFrom(this.license$!),
      license$: this.license$,
      featureUsage: this.featureUsage.start(),
      createLicensePoller: this.createLicensePoller.bind(this),
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.licenseSubscription !== undefined) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }
}
