/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, AppUpdater, CoreSetup, CoreStart } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { INGEST_HUB_APP_ID } from '@kbn/deeplinks-observability';
import type { Observable } from 'rxjs';
import { catchError, firstValueFrom, from, map, of, switchMap } from 'rxjs';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { FleetStart, FleetStartDeps } from '../plugin';
import type { IngestFlow, IngestHubStart, IngestHubStartDependencies } from './types';
import { INGEST_HUB_ENABLED_FLAG } from '../../common/ingest_hub/core/constants';
import { registerOnboardingApp } from './onboarding/core';
import { LazyAddIntegrationModal } from './add_integration_modal/lazy';

const IngestHubApp = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.IngestHubApp }))
);

/** Ingest Hub's own view of Fleet's start services, assembled from Fleet's own start contract. */
export type IngestHubStartServices = [CoreStart, IngestHubStartDependencies];

/** Only the dependencies the navigation observable needs; Fleet itself is not one of them. */
export type IngestHubNavigationDeps = Pick<IngestHubStartDependencies, 'spaces' | 'cloud'>;

export const createNavigationAvailable$ = (
  coreStart: CoreStart,
  deps: IngestHubNavigationDeps,
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

/**
 * Ingest Hub used to be its own plugin; its start dependencies are now assembled out of Fleet's,
 * with Fleet's own start contract standing in for what used to be the `fleet` dependency.
 */
export function toIngestHubStartServices(
  startServicesPromise: ReturnType<CoreSetup<FleetStartDeps, FleetStart>['getStartServices']>
): Promise<IngestHubStartServices> {
  return startServicesPromise.then(([coreStart, startDeps, fleetStart]) => [
    coreStart,
    {
      spaces: startDeps.spaces,
      cloud: startDeps.cloud,
      fleet: fleetStart,
    },
  ]);
}

/**
 * Registers the Ingest Hub and Onboarding apps. Both were registered by the ingest_hub plugin
 * before it was folded into Fleet.
 */
export function registerIngestHubApps({
  core,
  kibanaVersion,
  ingestFlows,
  cloudSetup,
}: {
  core: CoreSetup<FleetStartDeps, FleetStart>;
  kibanaVersion: string;
  ingestFlows: IngestFlow[];
  cloudSetup?: CloudSetup;
}) {
  const startServicesPromise = toIngestHubStartServices(core.getStartServices());

  core.application.register({
    id: INGEST_HUB_APP_ID,
    title: i18n.translate('xpack.fleet.ingestHub.appTitle', {
      defaultMessage: 'Ingest Hub',
    }),
    euiIconType: 'rocket',
    appRoute: '/app/ingest-hub',
    category: DEFAULT_APP_CATEGORIES.management,
    updater$: from(startServicesPromise).pipe(
      switchMap(([coreStart]) =>
        coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ENABLED_FLAG, false).pipe(
          map((enabled): AppUpdater => {
            return () => ({
              visibleIn: enabled ? ['classicSideNav', 'projectSideNav', 'globalSearch'] : [],
            });
          })
        )
      )
    ),
    mount: async (params: AppMountParameters) => {
      const [coreStart] = await startServicesPromise;
      const isEnabled = await firstValueFrom(
        coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ENABLED_FLAG, false)
      );
      const { element, history } = params;

      if (!isEnabled) {
        coreStart.application.navigateToApp('discover');
        return () => {};
      }

      const root = createRoot(element);
      root.render(
        coreStart.rendering.addContext(<IngestHubApp ingestFlows={ingestFlows} history={history} />)
      );
      return () => root.unmount();
    },
  });

  registerOnboardingApp(core, startServicesPromise, kibanaVersion, cloudSetup);
}

/** The slice of Fleet's start contract that Ingest Hub owns. */
export function createIngestHubStart({
  core,
  deps,
  isServerless,
  ingestFlows,
}: {
  core: CoreStart;
  deps: IngestHubNavigationDeps;
  isServerless: boolean;
  ingestFlows: IngestFlow[];
}): IngestHubStart {
  return {
    registerIngestFlow: (flow: IngestFlow) => {
      ingestFlows.push(flow);
    },
    navigationAvailable$: createNavigationAvailable$(core, deps, isServerless),
    AddIntegrationModal: LazyAddIntegrationModal,
  };
}
