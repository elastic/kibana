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
import { of, from } from 'rxjs';
import { map, catchError } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import type {
  ClassicStreamsStatus,
  StreamsNavigationStatus,
  StreamsPluginClass,
  StreamsPluginSetup,
  StreamsPluginSetupDependencies,
  StreamsPluginStart,
  StreamsPluginStartDependencies,
  WiredStreamsStatus,
} from './types';
import type { StreamsRepositoryClient } from './api';

export class Plugin implements StreamsPluginClass {
  public config: StreamsPublicConfig;
  public logger: Logger;

  private repositoryClient!: StreamsRepositoryClient;
  private isServerless: boolean;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, pluginSetup: StreamsPluginSetupDependencies): StreamsPluginSetup {
    this.repositoryClient = createRepositoryClient(core);
    return {};
  }

  start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart {
    return {
      streamsRepositoryClient: this.repositoryClient,
      navigationStatus$: createStreamsNavigationStatusObservable(
        pluginsStart,
        core.application,
        this.isServerless
      ),
      getWiredStatus: async () => {
        try {
          return await this.repositoryClient.fetch('GET /api/streams/_status', {
            signal: new AbortController().signal,
          });
        } catch (error) {
          this.logger.error(error instanceof Error ? error : String(error));
          return UNKNOWN_WIRED_STATUS;
        }
      },
      getClassicStatus: async () => {
        try {
          return await this.repositoryClient.fetch('GET /internal/streams/_classic_status', {
            signal: new AbortController().signal,
          });
        } catch (error) {
          this.logger.error(error instanceof Error ? error : String(error));
          return UNKNOWN_CLASSIC_STATUS;
        }
      },
      enableWiredMode: async (signal: AbortSignal) => {
        return await this.repositoryClient.fetch('POST /api/streams/_enable 2023-10-31', {
          signal,
        });
      },
      disableWiredMode: async (signal: AbortSignal) => {
        return await this.repositoryClient.fetch('POST /api/streams/_disable 2023-10-31', {
          signal,
        });
      },
      config$: of(this.config),
    };
  }

  stop() {}
}

const UNKNOWN_WIRED_STATUS: WiredStreamsStatus = { enabled: 'unknown', can_manage: false };
const UNKNOWN_CLASSIC_STATUS: ClassicStreamsStatus = { can_manage: false };

const createStreamsNavigationStatusObservable = once(
  (
    deps: StreamsPluginStartDependencies,
    application: ApplicationStart,
    isServerless: boolean
  ): Observable<StreamsNavigationStatus> => {
    const hasCapabilities = application.capabilities?.streams?.show;
    const isServerlessObservability = deps.cloud?.serverless.projectType === 'observability';
    const isServerlessSecurity = deps.cloud?.serverless.projectType === 'security';

    if (!hasCapabilities) {
      return of({ status: 'disabled' });
    }

    if (isServerless) {
      // For serverless, only check cloud project type
      return of({
        status: isServerlessObservability || isServerlessSecurity ? 'enabled' : 'disabled',
      });
    }

    // For non-serverless, check the active space solution
    if (!deps.spaces?.getActiveSpace) {
      return of({ status: 'enabled' });
    }

    return from(deps.spaces.getActiveSpace()).pipe(
      map((space) => {
        const spaceSolution = space?.solution;
        const isValidSolution =
          !spaceSolution ||
          spaceSolution === 'classic' ||
          spaceSolution === 'oblt' ||
          spaceSolution === 'security';
        return { status: isValidSolution ? 'enabled' : 'disabled' } as const;
      }),
      catchError(() => {
        return of({ status: 'enabled' } as const);
      })
    );
  }
);
