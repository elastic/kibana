/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { UploadStatus } from '../file_manager/file_manager';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { FileStatusLite } from './file_status_lite';
import { FileStatusFull } from './file_status_full';

interface FileStatusProps {
  uploadStatus: UploadStatus;
  fileStatus: FileAnalysis;
  deleteFile: () => void;
  index: number;
  showFileContentPreview?: boolean;
  showFileSummary?: boolean;
}

type Props = FileStatusProps & { lite: boolean };

export const FileStatus: FC<Props> = ({
  lite,
  uploadStatus,
  fileStatus,
  deleteFile,
  index,
  showFileContentPreview,
  showFileSummary,
}) => {
  const FileStatusComp = lite ? FileStatusLite : FileStatusFull;
  return (
    <FileStatusComp
      uploadStatus={uploadStatus}
      fileStatus={fileStatus}
      deleteFile={deleteFile}
      index={index}
      showFileContentPreview={showFileContentPreview}
      showFileSummary={showFileSummary}
    />
  );
};
