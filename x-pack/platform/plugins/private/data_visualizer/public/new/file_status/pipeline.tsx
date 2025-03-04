/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { IngestPipeline as IngestPipelineEditor } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  fileStatus: FileAnalysis;
  showTitle?: boolean;
}

export const IngestPipeline: FC<Props> = ({ fileStatus, showTitle = true }) => {
  const [localPipeline, setLocalPipeline] = useState(
    JSON.stringify(fileStatus.results!.ingest_pipeline, null, 2)
  );

  return (
    <IngestPipelineEditor
      initialized={false}
      data={localPipeline}
      onChange={(value) => {
        setLocalPipeline(value);
      }}
      indexName={''}
      showTitle={showTitle}
    />
  );
};
