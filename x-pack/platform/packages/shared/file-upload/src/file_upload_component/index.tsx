/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import type { ResultLinks, FileUploadResults } from '@kbn/file-upload-common';
import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import type { FileUploadStartDependencies } from './kibana_context';
import type { GetAdditionalLinks } from './new/results_links';

export type { FileDataVisualizerSpec } from './file_data_visualizer';
export { FileDataVisualizer } from './file_data_visualizer';

const FileDataVisualizerComponent = React.lazy(() => import('./file_data_visualizer'));

export const FileDataVisualizerWrapper: FC<{
  getDependencies: () => Promise<FileUploadStartDependencies>;
  resultLinks?: ResultLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  getFieldsStatsGrid?: () => React.FC<any>;
  getAdditionalLinks?: GetAdditionalLinks;
  location: string;
}> = ({
  resultLinks,
  setUploadResults,
  location,
  getDependencies,
  getFieldsStatsGrid,
  getAdditionalLinks,
}) => {
  const [dependencies, setDependencies] = useState<FileUploadStartDependencies | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDependencies().then((deps) => {
      if (isMounted) {
        setDependencies(deps);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [getDependencies, getFieldsStatsGrid, getAdditionalLinks]);
  if (dependencies === null) {
    return <EuiSkeletonText lines={3} />;
  }

  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerComponent
        dependencies={dependencies}
        resultLinks={resultLinks}
        setUploadResults={setUploadResults}
        location={location}
        getFieldsStatsGrid={getFieldsStatsGrid as any}
        getAdditionalLinks={getAdditionalLinks}
      />
    </React.Suspense>
  );
};

export function getFileDataVisualizerWrapper(
  getDependencies: () => Promise<FileUploadStartDependencies>,
  location: string,
  resultLinks?: ResultLinks,
  getFieldsStatsGrid?: () => React.FC<any>,
  setUploadResults?: (results: FileUploadResults) => void,
  getAdditionalLinks?: GetAdditionalLinks
) {
  return (
    <FileDataVisualizerWrapper
      getDependencies={getDependencies}
      resultLinks={resultLinks}
      setUploadResults={setUploadResults}
      location={location}
      getFieldsStatsGrid={getFieldsStatsGrid}
      getAdditionalLinks={getAdditionalLinks}
    />
  );
}
