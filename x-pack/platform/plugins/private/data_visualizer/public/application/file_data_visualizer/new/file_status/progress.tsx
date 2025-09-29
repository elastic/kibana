/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress } from '@elastic/eui';
import type { FileAnalysis } from '@kbn/file-upload';
import React from 'react';

interface UploadProgressProps {
  fileStatus: FileAnalysis;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ fileStatus }) => {
  return (
    <EuiProgress
      value={Math.floor(fileStatus.importProgress)}
      max={100}
      size="s"
      label={fileStatus.fileName}
      valueText={true}
      color={fileStatus.importProgress === 100 ? 'success' : 'primary'}
    />
  );
};
