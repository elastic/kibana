/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, AppUpdater, CoreStart } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { INGEST_HUB_APP_ID } from '@kbn/deeplinks-observability';
import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  catchError,
  firstValueFrom,
  from,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { once } from 'lodash';
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

const ALLOWED_SPACE_SOLUTIONS = new Set(['classic', 'oblt']);

const getAppEnabled$ = once(
  (
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
          map((space) => ALLOWED_SPACE_SOLUTIONS.has(space.solution ?? '')),
          catchError(() => of(true))
        );
      }),
      shareReplay(1)
    );
  }
);

export class IngestHubPlugin
  implements Plugin<IngestHubSetup, IngestHubStart, object, IngestHubStartDependencies>
{
  private readonly ingestFlows$ = new BehaviorSubject<IngestFlow[]>([]);
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  setup(coreSetup: CoreSetup<IngestHubStartDependencies>): IngestHubSetup {
    const isServerless = this.context.env.packageInfo.buildFlavor === 'serverless';
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
        switchMap(([coreStart, deps]) =>
          getAppEnabled$(coreStart, deps, isServerless).pipe(
            map(
              (appEnabled): AppUpdater =>
                () => ({
                  visibleIn: appEnabled ? ['sideNav', 'globalSearch'] : [],
                })
            )
          )
        )
      ),
      mount: async (params: AppMountParameters) => {
        const [coreStart, deps] = await startServicesPromise;
        const appEnabled = await firstValueFrom(getAppEnabled$(coreStart, deps, isServerless));
        const { element, history } = params;

        if (!appEnabled) {
          coreStart.application.navigateToApp('discover');
          return () => {};
        }

        const root = createRoot(element);
        root.render(
          coreStart.rendering.addContext(
            <KibanaContextProvider services={coreStart}>
              <IngestHubApp ingestFlows$={this.ingestFlows$} history={history} />
            </KibanaContextProvider>
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
      registerIngestFlows: (flows: IngestFlow[]) => {
        const existing = this.ingestFlows$.value;
        const existingIds = new Set(existing.map((f) => f.id));
        const newFlows = flows.filter((flow) => {
          if (existingIds.has(flow.id)) {
            // Duplicate ids might break React list rendering
            this.logger.warn(`Duplicate flow id "${flow.id}" — skipping registration.`);
            return false;
          }
          existingIds.add(flow.id);
          return true;
        });
        if (newFlows.length > 0) {
          this.ingestFlows$.next([...existing, ...newFlows]);
        }
      },
      appEnabled$: getAppEnabled$(coreStart, deps, isServerless),
    };
  }
}
