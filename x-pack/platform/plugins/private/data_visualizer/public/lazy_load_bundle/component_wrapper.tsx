/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Suspense } from 'react';
import { EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../common/app';
import type { DataDriftDetectionAppStateProps } from '../application/data_drift/data_drift_app_state';

const LazyWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiSkeletonText lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

const FileDataVisualizerComponent = React.lazy(
  () => import('../application/file_data_visualizer/file_data_visualizer')
);

export const FileDataVisualizerWrapper: FC<{
  resultLinks?: ResultLinks;
  setUploadResults?: (results: FileUploadResults) => void;
}> = ({ resultLinks, setUploadResults }) => {
  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerComponent resultLinks={resultLinks} setUploadResults={setUploadResults} />
    </React.Suspense>
  );
};

export function getFileDataVisualizerWrapper(
  resultLinks?: ResultLinks,
  setUploadResults?: (results: FileUploadResults) => void
) {
  return (
    <FileDataVisualizerWrapper resultLinks={resultLinks} setUploadResults={setUploadResults} />
  );
}

const DataDriftLazy = React.lazy(() => import('../application/data_drift'));

/**
 * Lazy-wrapped ExplainLogRateSpikesAppState React component
 * @param {DataDriftDetectionAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const DataDrift: FC<DataDriftDetectionAppStateProps> = (props) => (
  <LazyWrapper>
    <DataDriftLazy {...props} />
  </LazyWrapper>
);
