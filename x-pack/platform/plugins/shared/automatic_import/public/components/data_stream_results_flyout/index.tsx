/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { DataStreamResultsFlyoutComponent } from './types';

const DataStreamResultsFlyout = React.lazy(() =>
  import('./data_stream_results_flyout').then((module) => ({
    default: module.DataStreamResultsFlyout,
  }))
);

export const getDataStreamResultsFlyoutComponent = (): DataStreamResultsFlyoutComponent =>
  React.memo(function DataStreamResultsFlyoutLazy({
    integrationId,
    integrationName,
    dataStream,
    onClose,
  }) {
    return (
      <Suspense fallback={null}>
        <DataStreamResultsFlyout
          integrationId={integrationId}
          integrationName={integrationName}
          dataStream={dataStream}
          onClose={onClose}
        />
      </Suspense>
    );
  });
