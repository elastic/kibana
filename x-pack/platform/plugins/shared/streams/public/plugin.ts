/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { Observable, from, shareReplay, startWith } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import {
  StreamsPluginClass,
  StreamsPluginSetup,
  StreamsPluginSetupDependencies,
  StreamsPluginStart,
  StreamsPluginStartDependencies,
  StreamsStatus,
} from './types';
import { StreamsRepositoryClient } from './api';

export class Plugin implements StreamsPluginClass {
  public config: StreamsPublicConfig;
  public logger: Logger;

  private repositoryClient!: StreamsRepositoryClient;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, pluginSetup: StreamsPluginSetupDependencies): StreamsPluginSetup {
    this.repositoryClient = createRepositoryClient(core);
    return {
      status$: createStreamsStatusObservable(pluginSetup, this.repositoryClient, this.logger),
    };
  }

  start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart {
    return {
      streamsRepositoryClient: this.repositoryClient,
      status$: createStreamsStatusObservable(pluginsStart, this.repositoryClient, this.logger),
    };
  }

  stop() {}
}

const ENABLED_STATUS: StreamsStatus = { status: 'enabled' };
const DISABLED_STATUS: StreamsStatus = { status: 'disabled' };
const UNKNOWN_STATUS: StreamsStatus = { status: 'unknown' };

const createStreamsStatusObservable = once(
  (
    deps: StreamsPluginSetupDependencies | StreamsPluginStartDependencies,
    repositoryClient: StreamsRepositoryClient,
    logger: Logger
  ): Observable<StreamsStatus> => {
    const isObservabilityServerless =
      deps.cloud?.isServerlessEnabled && deps.cloud?.serverless.projectType === 'observability';

    if (isObservabilityServerless) {
      return from([ENABLED_STATUS]);
    }

    return from(
      repositoryClient
        .fetch('GET /api/streams/_status', {
          signal: new AbortController().signal,
        })
        .then(
          (response) => (response.enabled ? ENABLED_STATUS : DISABLED_STATUS),
          (error) => {
            logger.error(error);
            return UNKNOWN_STATUS;
          }
        )
    ).pipe(startWith(UNKNOWN_STATUS), shareReplay(1));
  }
);
