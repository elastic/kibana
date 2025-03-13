/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { IngestPipeline as IngestPipelineEditor } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  fileStatus: FileAnalysis;
  setPipeline?: (pipeline: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
}

export const IngestPipeline: FC<Props> = ({
  fileStatus,
  setPipeline,
  showTitle = true,
  readonly = false,
}) => {
  const [localPipeline, setLocalPipeline] = useState(JSON.stringify(fileStatus.pipeline, null, 2));

  useDebounce(
    () => {
      if (setPipeline) {
        setPipeline(localPipeline);
      }
    },
    500,
    [localPipeline]
  );

  return (
    <IngestPipelineEditor
      initialized={readonly}
      data={localPipeline}
      onChange={(value) => {
        setLocalPipeline(value);
      }}
      indexName={''}
      showTitle={showTitle}
    />
  );
};
