/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../../common/app';

const FileDataVisualizerLiteComponent = React.lazy(() => import('../file_upload_lite'));

export const FileDataVisualizerLiteWrapper: FC<{
  resultLinks?: ResultLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddInference?: string;
  autoCreateDataView?: boolean;
  indexSettings?: IndicesIndexSettings;
  onClose?: () => void;
}> = ({
  resultLinks,
  setUploadResults,
  autoAddInference,
  autoCreateDataView,
  indexSettings,
  onClose,
}) => {
  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerLiteComponent
        resultLinks={resultLinks}
        setUploadResults={setUploadResults}
        autoAddInference={autoAddInference}
        autoCreateDataView={autoCreateDataView}
        indexSettings={indexSettings}
        onClose={onClose}
      />
    </React.Suspense>
  );
};

export function getFileDataVisualizerLiteWrapper(
  resultLinks?: ResultLinks,
  setUploadResults?: (results: FileUploadResults) => void,
  autoAddInference?: string,
  autoCreateDataView?: boolean,
  indexSettings?: IndicesIndexSettings,
  onClose?: () => void
) {
  return (
    <FileDataVisualizerLiteWrapper
      resultLinks={resultLinks}
      setUploadResults={setUploadResults}
      autoAddInference={autoAddInference}
      autoCreateDataView={autoCreateDataView}
      indexSettings={indexSettings}
      onClose={onClose}
    />
  );
}
