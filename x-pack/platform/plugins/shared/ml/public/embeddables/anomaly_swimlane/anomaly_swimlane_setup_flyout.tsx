/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '..';
import { HttpService } from '../../application/services/http_service';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';

export function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  parentApi: unknown,
  onConfirm: (state: AnomalySwimlaneEmbeddableUserInput) => void,
  input?: Partial<AnomalySwimLaneEmbeddableState>
) {
  const { http } = coreStart;

  const adJobsApiService = jobsApiProvider(new HttpService(http));

  openLazyFlyout({
    core: coreStart,
    parentApi,
    flyoutProps: {
      'data-test-subj': 'ooooooo',
    },
    loadContent: async ({ closeFlyout }) => {
      return (
        <KibanaContextProvider services={{ ...coreStart }}>
          <AnomalySwimlaneInitializer
            adJobsApiService={adJobsApiService}
            initialInput={input}
            onCreate={(explicitInput) => {
              onConfirm(explicitInput);
              closeFlyout();
            }}
            onCancel={() => {
              closeFlyout();
            }}
          />
        </KibanaContextProvider>
      );
    },
  });
}
