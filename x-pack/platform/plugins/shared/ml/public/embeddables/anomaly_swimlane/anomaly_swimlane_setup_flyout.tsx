/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '..';
import { HttpService } from '../../application/services/http_service';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';

export async function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  parentApi: unknown,
  focusedPanelId: string,
  input?: Partial<AnomalySwimLaneEmbeddableState>
): Promise<AnomalySwimlaneEmbeddableUserInput> {
  const { http, overlays, ...startServices } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise(async (resolve, reject) => {
    try {
      const adJobsApiService = jobsApiProvider(new HttpService(http));

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider services={{ ...coreStart }}>
            <AnomalySwimlaneInitializer
              adJobsApiService={adJobsApiService}
              initialInput={input}
              onCreate={(explicitInput) => {
                resolve(explicitInput);
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              onCancel={() => {
                reject();
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
            />
          </KibanaContextProvider>,
          startServices
        ),
        {
          type: 'push',
          ownFocus: true,
          size: 's',
          onClose: () => {
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
        }
      );

      if (tracksOverlays(parentApi)) {
        parentApi.openOverlay(flyoutSession, {
          focusedPanelId,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}
