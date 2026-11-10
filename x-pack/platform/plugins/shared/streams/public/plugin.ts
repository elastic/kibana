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
  IUiSettingsClient,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { Observable } from 'rxjs';
import { of, from } from 'rxjs';
import { map, catchError } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import {
  STREAMS_FEATURE_ID,
  STREAMS_UI_PRIVILEGES,
  STREAMS_V2_FEATURE_ID,
  STREAMS_V2_UI_PRIVILEGES,
} from '../common/constants';
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
import { createStreamsEnrichment } from './services/esql_stream_enricher';

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

    if (pluginSetup.esql) {
      const application = core.getStartServices().then(([coreStart]) => coreStart.application);
      const { enrichSources, enrichViews } = createStreamsEnrichment(
        this.repositoryClient,
        application
      );

      pluginSetup.esql.registerSourceEnricher(enrichSources);
      pluginSetup.esql.registerViewEnricher(enrichViews);
    }

    return {};
  }

  start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart {
    return {
      streamsRepositoryClient: this.repositoryClient,
      navigationStatus$: createStreamsNavigationStatusObservable(
        pluginsStart,
        core.application,
        core.uiSettings,
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

const UNKNOWN_WIRED_STATUS: WiredStreamsStatus = {
  logs: 'unknown',
  'logs.otel': 'unknown',
  'logs.ecs': 'unknown',
  can_manage: false,
};
const UNKNOWN_CLASSIC_STATUS: ClassicStreamsStatus = { can_manage: false };

const createStreamsNavigationStatusObservable = once(
  (
    deps: StreamsPluginStartDependencies,
    application: ApplicationStart,
    uiSettings: IUiSettingsClient,
    isServerless: boolean
  ): Observable<StreamsNavigationStatus> => {
    // Either experience is enough for the navigation entry; the app routes to the one granted.
    // V2 also needs the per-space canvas setting, otherwise the app has nothing to show.
    const hasCapabilities =
      application.capabilities?.[STREAMS_FEATURE_ID]?.[STREAMS_UI_PRIVILEGES.show] ||
      (application.capabilities?.[STREAMS_V2_FEATURE_ID]?.[STREAMS_V2_UI_PRIVILEGES.show] &&
        uiSettings.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_CANVAS, false));
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
