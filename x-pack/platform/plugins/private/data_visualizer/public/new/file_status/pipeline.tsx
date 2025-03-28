/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { IngestPipeline as IngestPipelineType } from '@kbn/file-upload-plugin/common/types';
import { IngestPipeline as IngestPipelineEditor } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  pipeline: IngestPipelineType;
  setPipeline?: (pipeline: string) => void;
  readonly?: boolean;
  showTitle?: boolean;
}

export const IngestPipeline: FC<Props> = ({
  pipeline,
  setPipeline,
  showTitle = true,
  readonly = false,
}) => {
  const [localPipeline, setLocalPipeline] = useState(JSON.stringify(pipeline, null, 2));

  useEffect(() => {
    setLocalPipeline(JSON.stringify(pipeline, null, 2));
  }, [pipeline]);

  useDebounce(
    () => {
      if (setPipeline && pipeline !== undefined) {
        const pOriginal = JSON.stringify(pipeline);
        const pLocal = JSON.stringify(JSON.parse(localPipeline));
        if (pOriginal !== pLocal) {
          setPipeline(localPipeline);
        }
      }
    },
    500,
    [localPipeline]
  );
  // add a warning that editing the pipeline when there are more than one file will update the mappings !!!!!!!
  // or somehow stop pipeline editing from triggering observerable FileAnalysis
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
