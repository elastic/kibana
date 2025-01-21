/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { ResultLinks } from '../../../common/app';
import type { FileUploadResults } from './create_flyout';

const FileDataVisualizerLiteComponent = React.lazy(() => import('../file_upload_lite'));

export const FileDataVisualizerLiteWrapper: FC<{
  resultLinks?: ResultLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddSemanticTextField?: boolean;
  onClose?: () => void;
}> = ({ resultLinks, setUploadResults, autoAddSemanticTextField, onClose }) => {
  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerLiteComponent
        resultLinks={resultLinks}
        setUploadResults={setUploadResults}
        autoAddSemanticTextField={autoAddSemanticTextField}
        onClose={onClose}
      />
    </React.Suspense>
  );
};

// move FileUploadResults!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getFileDataVisualizerLiteWrapper(
  resultLinks?: ResultLinks,
  setUploadResults?: (results: FileUploadResults) => void,
  autoAddSemanticTextField?: boolean,
  onClose?: () => void
) {
  return (
    <FileDataVisualizerLiteWrapper
      resultLinks={resultLinks}
      setUploadResults={setUploadResults}
      autoAddSemanticTextField={autoAddSemanticTextField}
      onClose={onClose}
    />
  );
}
