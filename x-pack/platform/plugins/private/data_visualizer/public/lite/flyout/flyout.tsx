/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { FileUploadResults } from './create_flyout';
import { getFileDataVisualizerLiteWrapper } from './component_wrapper';

// import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
// import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// import type { TimeRange } from '@kbn/es-query';
// import { CreateJob } from './create_job';

interface Props {
  onClose?: () => void;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddInference?: string;
}

export const FileUploadLiteFlyoutContents: FC<Props> = ({
  onClose,
  setUploadResults,
  autoAddInference,
}) => {
  const Wrapper = getFileDataVisualizerLiteWrapper(
    undefined,
    setUploadResults,
    autoAddInference,
    onClose
  );
  return <>{Wrapper}</>;
};
