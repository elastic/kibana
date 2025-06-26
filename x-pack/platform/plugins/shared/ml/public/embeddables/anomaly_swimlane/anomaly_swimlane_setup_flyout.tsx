/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HttpService } from '@kbn/ml-services/http_service';
import { jobsApiProvider } from '@kbn/ml-services/ml_api_service/jobs';
import type { AnomalySwimlaneEmbeddableUserInput } from '@kbn/ml-common-types/anomaly_swim_lane';

import type { MlDependencies } from '../../application/app';
import type { MlStartDependencies } from '../../plugin';

import type { AnomalySwimLaneEmbeddableState } from '../types';

import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';

export function AnomalySwimlaneUserInput({
  coreStart,
  pluginStart,
  onConfirm,
  onCancel,
  input,
}: {
  coreStart: CoreStart;
  pluginStart: MlDependencies | MlStartDependencies;
  onConfirm: (state: AnomalySwimlaneEmbeddableUserInput) => void;
  onCancel: () => void;
  input?: Partial<AnomalySwimLaneEmbeddableState>;
}) {
  const { http } = coreStart;
  const adJobsApiService = jobsApiProvider(new HttpService(http));
  return (
    <KibanaContextProvider services={{ ...coreStart, ...pluginStart }}>
      <AnomalySwimlaneInitializer
        adJobsApiService={adJobsApiService}
        initialInput={input}
        onCreate={onConfirm}
        onCancel={onCancel}
      />
    </KibanaContextProvider>
  );
}
