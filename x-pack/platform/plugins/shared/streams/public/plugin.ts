/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { Observable } from 'rxjs';
import { BehaviorSubject, of } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import type {
  StreamsPluginClass,
  StreamsPluginSetup,
  StreamsPluginSetupDependencies,
  StreamsPluginStart,
  StreamsPluginStartDependencies,
  StreamsStatus,
} from './types';
import type { StreamsRepositoryClient } from './api';

export class Plugin implements StreamsPluginClass {
  public config: StreamsPublicConfig;
  public logger: Logger;

  private repositoryClient!: StreamsRepositoryClient;
  private wiredStatusSubject = new BehaviorSubject<StreamsStatus>(UNKNOWN_STATUS);

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, pluginSetup: StreamsPluginSetupDependencies): StreamsPluginSetup {
    this.repositoryClient = createRepositoryClient(core);
    return {};
  }

  start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart {
    this.refreshWiredStatus(pluginsStart);

    return {
      streamsRepositoryClient: this.repositoryClient,
      navigationStatus$: createStreamsNavigationStatusObservable(pluginsStart, core.application),
      wiredStatus$: this.wiredStatusSubject.asObservable(),
      enableWiredMode: async (signal: AbortSignal) => {
        const response = await this.repositoryClient.fetch('POST /api/streams/_enable 2023-10-31', {
          signal,
        });
        this.wiredStatusSubject.next(ENABLED_STATUS);
        return response;
      },
      disableWiredMode: async (signal: AbortSignal) => {
        const response = await this.repositoryClient.fetch(
          'POST /api/streams/_disable 2023-10-31',
          { signal }
        );
        this.wiredStatusSubject.next(DISABLED_STATUS);
        return response;
      },
      config$: of(this.config),
    };
  }

  private async refreshWiredStatus(deps: StreamsPluginStartDependencies) {
    try {
      const response = await this.repositoryClient.fetch('GET /api/streams/_status', {
        signal: new AbortController().signal,
      });
      this.wiredStatusSubject.next(response.enabled ? ENABLED_STATUS : DISABLED_STATUS);
    } catch (error) {
      this.logger.error(error);
      this.wiredStatusSubject.next(UNKNOWN_STATUS);
    }
  }

  stop() {}
}

const ENABLED_STATUS: StreamsStatus = { status: 'enabled' };
const DISABLED_STATUS: StreamsStatus = { status: 'disabled' };
const UNKNOWN_STATUS: StreamsStatus = { status: 'unknown' };

const createStreamsNavigationStatusObservable = once(
  (
    deps: StreamsPluginSetupDependencies | StreamsPluginStartDependencies,
    application: ApplicationStart
  ): Observable<StreamsStatus> => {
    const hasCapabilities = application.capabilities?.streams?.show;
    const isServerless = deps.cloud?.isServerlessEnabled;
    const isObservability = deps.cloud?.serverless.projectType === 'observability';

    if (!hasCapabilities) {
      return of(DISABLED_STATUS);
    }

    if (!isServerless) {
      return of(ENABLED_STATUS);
    }

    if (isServerless && isObservability) {
      return of(ENABLED_STATUS);
    }

    return of(DISABLED_STATUS);
  }
);
