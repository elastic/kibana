/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, AppUpdater, CoreStart } from '@kbn/core/public';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { INGEST_HUB_APP_ID } from '@kbn/deeplinks-observability';
import type { Observable } from 'rxjs';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { dynamic } from '@kbn/shared-ux-utility';
import type {
  IngestHubSetup,
  IngestHubStart,
  IngestHubStartDependencies,
  IngestFlow,
} from './types';
import { INGEST_HUB_ENABLED_FLAG } from '../common/constants';

const IngestHubApp = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.IngestHubApp }))
);

const createNavigationAvailable$ = (
  coreStart: CoreStart,
  deps: IngestHubStartDependencies,
  isServerless: boolean
): Observable<boolean> => {
  const projectType = deps.cloud?.serverless.projectType;

  return coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ENABLED_FLAG, false).pipe(
    switchMap((enabled) => {
      if (!enabled) return of(false);

      if (isServerless) {
        return of(projectType === 'observability');
      }

      if (!deps.spaces?.getActiveSpace) return of(true);

      return from(deps.spaces.getActiveSpace()).pipe(
        map((space) => {
          const solution = space?.solution;
          return !solution || solution === 'classic' || solution === 'oblt';
        }),
        catchError(() => of(true))
      );
    })
  );
};

export class IngestHubPlugin
  implements Plugin<IngestHubSetup, IngestHubStart, object, IngestHubStartDependencies>
{
  private readonly ingestFlows: IngestFlow[] = [];

  constructor(private readonly context: PluginInitializerContext) {}

  setup(coreSetup: CoreSetup<IngestHubStartDependencies>): IngestHubSetup {
    const startServicesPromise = coreSetup.getStartServices();

    coreSetup.application.register({
      id: INGEST_HUB_APP_ID,
      title: i18n.translate('xpack.ingestHub.appTitle', {
        defaultMessage: 'Ingest Hub',
      }),
      euiIconType: 'launch',
      appRoute: '/app/ingest-hub',
      category: DEFAULT_APP_CATEGORIES.management,
      updater$: from(startServicesPromise).pipe(
        switchMap(([coreStart]) =>
          coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ENABLED_FLAG, false).pipe(
            map((enabled): AppUpdater => {
              return () => ({
                visibleIn: enabled ? ['sideNav', 'globalSearch'] : [],
              });
            })
          )
        )
      ),
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await startServicesPromise;
        const isEnabled = coreStart.featureFlags.getBooleanValue(INGEST_HUB_ENABLED_FLAG, false);
        const { element, history } = params;

        if (!isEnabled) {
          coreStart.application.navigateToApp('discover');
          return () => {};
        }

        const root = createRoot(element);
        root.render(
          coreStart.rendering.addContext(
            <IngestHubApp ingestFlows={this.ingestFlows} history={history} />
          )
        );
        return () => root.unmount();
      },
    });

    return {};
  }

  start(coreStart: CoreStart, deps: IngestHubStartDependencies): IngestHubStart {
    const isServerless = this.context.env.packageInfo.buildFlavor === 'serverless';
    return {
      registerIngestFlow: (flow: IngestFlow) => {
        this.ingestFlows.push(flow);
      },
      navigationAvailable$: createNavigationAvailable$(coreStart, deps, isServerless),
    };
  }
}
