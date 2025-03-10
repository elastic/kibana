/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { Mappings as MappingsEditor } from '../../application/file_data_visualizer/components/import_settings/advanced/inputs';

interface Props {
  fileStatus: FileAnalysis;
  showTitle?: boolean;
}

export const Mappings: FC<Props> = ({ fileStatus, showTitle }) => {
  const [localMappings, setLocalMappings] = useState(
    JSON.stringify(fileStatus.results!.mappings, null, 2)
  );

  return (
    <MappingsEditor
      initialized={false}
      data={localMappings}
      onChange={(value) => {
        setLocalMappings(value);
      }}
      indexName={''}
      showTitle={showTitle}
    />
  );
};
