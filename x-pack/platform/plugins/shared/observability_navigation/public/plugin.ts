/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';
import { Observable, from, shareReplay } from 'rxjs';
import { once } from 'lodash';

import { createRepositoryClient } from '@kbn/server-route-repository-client';
import {
  ObservabilityNavigationPluginClass,
  ObservabilityNavigationPluginSetupDependencies,
  ObservabilityNavigationPluginSetup,
  ObservabilityNavigationPluginStartDependencies,
  ObservabilityNavigationPluginStart,
  ObservabilityNavigationItems,
} from './types';
import { ObservabilityNavigationRepositoryClient } from './api';

export class Plugin implements ObservabilityNavigationPluginClass {
  public logger: Logger;
  private repositoryClient!: ObservabilityNavigationRepositoryClient;
  constructor(context: PluginInitializerContext<{}>) {
    this.logger = context.logger.get();
  }

  setup(
    core: CoreSetup,
    pluginSetup: ObservabilityNavigationPluginSetupDependencies
  ): ObservabilityNavigationPluginSetup {
    this.repositoryClient = createRepositoryClient(core);
    return {};
  }

  start(
    core: CoreStart,
    pluginsStart: ObservabilityNavigationPluginStartDependencies
  ): ObservabilityNavigationPluginStart {
    return {
      sideNav$: createObservabilityNavigationItemsObservable(this.repositoryClient, this.logger),
    };
  }

  stop() {}
}

const createObservabilityNavigationItemsObservable = once(
  (
    repositoryClient: ObservabilityNavigationRepositoryClient,
    logger: Logger
  ): Observable<ObservabilityNavigationItems> => {
    return from(
      repositoryClient
        .fetch('GET /internal/observability_navigation', {
          signal: new AbortController().signal,
        })
        .then(
          (response) => {
            logger.debug(JSON.stringify(response, null, 2));
            return response;
          },
          (error) => {
            logger.error(error);
            return undefined;
          }
        )
    ).pipe(shareReplay(1));
  }
);
