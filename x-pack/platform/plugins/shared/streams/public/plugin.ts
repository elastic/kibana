/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { from, shareReplay, startWith } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import {
  StreamsPluginClass,
  StreamsPluginSetup,
  StreamsPluginSetupDependencies,
  StreamsPluginStart,
  StreamsPluginStartDependencies,
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
      status$: createStreamsStatusObservable(pluginSetup),
    };
  }

  start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart {
    return {
      streamsRepositoryClient: this.repositoryClient,
      status$: createStreamsStatusObservable(pluginsStart),
    };
  }

  stop() {}
}

const createStreamsStatusObservable = once(
  (deps: StreamsPluginSetupDependencies | StreamsPluginStartDependencies) => {
    return from([
      {
        status:
          deps.cloud.isServerlessEnabled && deps.cloud.serverless.projectType === 'observability'
            ? ('enabled' as const)
            : ('disabled' as const),
      },
    ]).pipe(startWith({ status: 'disabled' as const }), shareReplay(1));
  }
);
