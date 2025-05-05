/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiProgress } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type { FileAnalysis } from './file_manager/file_wrapper';

interface Props {
  filesStatus: FileAnalysis[];
}

export const OverallUploadProgress: FC<Props> = ({ filesStatus }) => {
  const overallProgress =
    filesStatus.map((file) => file.importProgress).reduce((acc, progress) => acc + progress, 0) /
    filesStatus.length;

  return <EuiProgress value={overallProgress} max={100} size="s" />;
};
