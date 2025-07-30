/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SingleMetricViewerEmbeddableUserInput, SingleMetricViewerEmbeddableInput } from '..';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import type { MlApi } from '../../application/services/ml_api_service';

export function EmbeddableSingleMetricViewerUserInput({
  coreStart,
  services,
  mlApi,
  onConfirm,
  onCancel,
  input,
}: {
  coreStart: CoreStart;
  services: { data: DataPublicPluginStart; share?: SharePluginStart };
  mlApi: MlApi;
  onConfirm: (state: SingleMetricViewerEmbeddableUserInput) => void;
  onCancel: () => void;
  input?: Partial<SingleMetricViewerEmbeddableInput>;
}) {
  const { data, share } = services;
  const timefilter = data.query.timefilter.timefilter;
  return (
    <KibanaContextProvider
      services={{
        mlServices: { mlApi },
        data,
        share,
        ...coreStart,
      }}
    >
      <SingleMetricViewerInitializer
        data-test-subj="mlSingleMetricViewerEmbeddableInitializer"
        mlApi={mlApi}
        bounds={timefilter.getBounds()!}
        initialInput={input}
        onCreate={onConfirm}
        onCancel={onCancel}
      />
    </KibanaContextProvider>
  );
}
