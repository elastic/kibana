/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { IModule, IScope } from 'angular';
import * as React from 'react';

import { UIRoutes as KibanaUIRoutes } from 'ui/routes';

import { DEFAULT_INDEX_KEY, DEFAULT_ANOMALY_SCORE } from '../../../../common/constants';
import {
  AppBufferedKibanaServiceCall,
  AppFrameworkAdapter,
  AppKibanaAdapterServiceRefs,
  AppKibanaUIConfig,
  AppTimezoneProvider,
} from '../../lib';

export const KibanaConfigContext = React.createContext<Partial<AppKibanaFrameworkAdapter>>({});

export class AppKibanaFrameworkAdapter implements AppFrameworkAdapter {
  public bytesFormat?: string;
  public dateFormat?: string;
  public dateFormatTz?: string;
  public darkMode?: boolean;
  public indexPattern?: string;
  public anomalyScore?: number;
  public kbnVersion?: string;
  public scaledDateFormat?: string;
  public timezone?: string;

  private adapterService: KibanaAdapterServiceProvider;
  private timezoneProvider: AppTimezoneProvider;

  constructor(uiModule: IModule, uiRoutes: KibanaUIRoutes, timezoneProvider: AppTimezoneProvider) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.timezoneProvider = timezoneProvider;
    this.register(uiModule, uiRoutes);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  private register = (adapterModule: IModule, uiRoutes: KibanaUIRoutes) => {
    adapterModule.provider('kibanaAdapter', this.adapterService);

    adapterModule.run((
      config: AppKibanaUIConfig,
      kbnVersion: string,
      Private: <Provider>(provider: Provider) => Provider,
      // @ts-ignore: inject kibanaAdapter to force eager installation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kibanaAdapter: any
    ) => {
      this.timezone = Private(this.timezoneProvider)();
      this.kbnVersion = kbnVersion;
      this.bytesFormat = config.get('format:bytes:defaultPattern');
      this.dateFormat = config.get('dateFormat');
      this.dateFormatTz = config.get('dateFormat:tz');
      try {
        this.darkMode = config.get('theme:darkMode');
      } catch (e) {
        this.darkMode = false;
      }
      this.indexPattern = config.get(DEFAULT_INDEX_KEY);
      this.anomalyScore = config.get(DEFAULT_ANOMALY_SCORE);
      this.scaledDateFormat = config.get('dateFormat:scaled');
    });

    // adapterModule.config($locationProvider => {
    //   $locationProvider.html5Mode({
    //     enabled: false,
    //     requireBase: false,
    //     rewriteLinks: false,
    //   });
    // });
  };
}

class KibanaAdapterServiceProvider {
  public serviceRefs: AppKibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<AppBufferedKibanaServiceCall<AppKibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: AppKibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: AppKibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<AppBufferedKibanaServiceCall<AppKibanaAdapterServiceRefs>>
  ) {
    if (!this.serviceRefs) {
      return;
    }

    this.serviceRefs.rootScope.$apply(() => {
      bufferedCalls.forEach(serviceCall => {
        if (!this.serviceRefs) {
          return;
        }
        return serviceCall(this.serviceRefs);
      });
    });
  }
}
