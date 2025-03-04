/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
// import { EuiTextArea } from '@elastic/eui';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { IngestPipeline } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  fileStatus: FileAnalysis;
}

export const Pipeline: FC<Props> = ({ fileStatus }) => {
  const [localPipeline, setLocalPipeline] = useState(
    JSON.stringify(fileStatus.results!.ingest_pipeline, null, 2)
  );

  // return (
  //   <EuiTextArea
  //     value={localMappings}
  //     onChange={(e) => {
  //       const value = e.target.value;
  //       setLocalMappings(value);
  //     }}
  //   />
  // );
  return (
    <IngestPipeline
      initialized={false}
      data={localPipeline}
      onChange={(value) => {
        setLocalPipeline(value);
      }}
      indexName={''}
    />
  );
};
