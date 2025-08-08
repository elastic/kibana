/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HttpService } from '../../application/services/http_service';
import type { AnomalyChartsEmbeddableState } from '..';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { getMlGlobalServices } from '../../application/util/get_services';
import type { MlStartDependencies } from '../../plugin';

export function EmbeddableAnomalyChartsUserInput({
  coreStart,
  pluginStart,
  onConfirm,
  onCancel,
  input,
}: {
  coreStart: CoreStart;
  pluginStart: MlStartDependencies;
  onConfirm: (state: AnomalyChartsEmbeddableState) => void;
  onCancel: () => void;
  input?: AnomalyChartsEmbeddableState;
}) {
  const { http } = coreStart;
  const adJobsApiService = jobsApiProvider(new HttpService(http));
  const mlServices = getMlGlobalServices(coreStart, pluginStart.data.dataViews);

  return (
    <KibanaContextProvider services={{ ...coreStart, ...pluginStart, mlServices }}>
      <AnomalyChartsInitializer
        initialInput={input}
        onCreate={onConfirm}
        onCancel={onCancel}
        adJobsApiService={adJobsApiService}
      />
    </KibanaContextProvider>
  );
}
