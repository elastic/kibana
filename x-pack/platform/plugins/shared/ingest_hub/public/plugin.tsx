/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, AppUpdater } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, type CoreSetup, type Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { from, map, switchMap } from 'rxjs';
import { dynamic } from '@kbn/shared-ux-utility';
import type { IngestHubSetup, IngestHubStart, IngestFlow } from './types';
import { INGEST_HUB_ENABLED_FLAG } from '../common/constants';

const IngestHubApp = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.IngestHubApp }))
);

export class IngestHubPlugin implements Plugin<IngestHubSetup, IngestHubStart> {
  private readonly ingestFlows: IngestFlow[] = [];

  setup(coreSetup: CoreSetup): IngestHubSetup {
    const startServicesPromise = coreSetup.getStartServices();

    coreSetup.application.register({
      id: 'ingestHub',
      title: i18n.translate('xpack.ingestHub.appTitle', {
        defaultMessage: 'Ingest Hub',
      }),
      euiIconType: 'launch',
      appRoute: '/app/ingest-hub',
      category: DEFAULT_APP_CATEGORIES.observability,
      updater$: from(startServicesPromise).pipe(
        switchMap(([coreStart]) =>
          coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ENABLED_FLAG, false).pipe(
            map(
              (enabled): AppUpdater =>
                () => ({
                  visibleIn: enabled ? ['sideNav', 'globalSearch'] : [],
                })
            )
          )
        )
      ),
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await startServicesPromise;
        const isEnabled = coreStart.featureFlags.getBooleanValue(INGEST_HUB_ENABLED_FLAG, false);
        const { element } = params;

        if (!isEnabled) {
          coreStart.application.navigateToApp('discover');
          return () => {};
        }

        ReactDOM.render(
          coreStart.rendering.addContext(<IngestHubApp ingestFlows={this.ingestFlows} />),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    return {};
  }

  start(): IngestHubStart {
    return {
      registerIngestFlow: (flow: IngestFlow) => {
        this.ingestFlows.push(flow);
      },
    };
  }
}
