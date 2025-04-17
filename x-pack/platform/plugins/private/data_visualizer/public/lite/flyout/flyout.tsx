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
import type { FlyoutContent } from '@kbn/file-upload-common/src/types';
import { getFileDataVisualizerLiteWrapper } from './component_wrapper';

interface Props {
  onClose?: () => void;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddInference?: string;
  autoCreateDataView?: boolean;
  indexSettings?: IndicesIndexSettings;
  initialIndexName?: string;
  flyoutContent?: FlyoutContent;
}

export const FileUploadLiteFlyoutContents: FC<Props> = ({
  onClose,
  setUploadResults,
  autoAddInference,
  autoCreateDataView,
  indexSettings,
  initialIndexName,
  flyoutContent,
}) => {
  const Wrapper = getFileDataVisualizerLiteWrapper(
    undefined,
    setUploadResults,
    autoAddInference,
    autoCreateDataView,
    indexSettings,
    initialIndexName,
    flyoutContent,
    onClose
  );
  return <>{Wrapper}</>;
};
