/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalInvestigationFeature } from '@kbn/discover-shared-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import React, { lazy, Suspense } from 'react';
import type { Observable } from 'rxjs';
import type { OpenInvestigationOptions } from '../plugin';
import { reportSignalInvestigationShown } from '../telemetry/shown_telemetry';

export const SIGNAL_INVESTIGATION_FEATURE_ID = 'signal-investigation' as const;

const LogDocumentInvestigationActionLazy = lazy(() =>
  import('./discover_feature').then((module) => ({
    default: module.LogDocumentInvestigationAction,
  }))
);

/** Creates the `discoverShared` feature for Discover's app menu and logs document viewer. */
export const createDiscoverInvestigationFeature = ({
  licensing,
  openInvestigation,
  currentAppId$,
}: {
  licensing: LicensingPluginStart;
  openInvestigation: (options: OpenInvestigationOptions) => Promise<void>;
  currentAppId$: Observable<string | undefined>;
}): SignalInvestigationFeature => {
  let hasPlatinum = false;
  licensing.license$.subscribe((license) => {
    hasPlatinum = Boolean(license?.hasAtLeast('platinum'));
  });

  let reportedAppMenuForVisit = false;
  let lastAppId: string | undefined;
  currentAppId$.subscribe((appId) => {
    if (appId === lastAppId) {
      return;
    }
    lastAppId = appId;
    reportedAppMenuForVisit = false;
  });

  return {
    id: SIGNAL_INVESTIGATION_FEATURE_ID,
    isAvailable: () => {
      if (hasPlatinum && !reportedAppMenuForVisit) {
        reportedAppMenuForVisit = true;
        reportSignalInvestigationShown({
          app: 'discover',
          surface: 'appMenu',
        });
      }
      return hasPlatinum;
    },
    openFromAppMenu: (params) => {
      if (!hasPlatinum) {
        return;
      }
      void import('./discover_feature').then(({ buildDiscoverAppMenuSeed }) => {
        const seed = buildDiscoverAppMenuSeed(params);
        if (!seed) {
          return;
        }
        void openInvestigation({ seed, session: 'start' });
      });
    },
    renderLogDocumentAction: ({ doc, dataView }) => {
      if (!hasPlatinum) {
        return null;
      }
      return (
        <Suspense fallback={null}>
          <LogDocumentInvestigationActionLazy
            key={doc.id}
            doc={doc}
            dataView={dataView}
            licensing={licensing}
            openInvestigation={openInvestigation}
          />
        </Suspense>
      );
    },
  };
};
