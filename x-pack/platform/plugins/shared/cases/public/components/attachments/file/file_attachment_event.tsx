/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { DownloadableFile } from './types';

import { FileNameLink } from './file_name_link';
import { FilePreview } from './file_preview';
import * as i18n from './translations';
import { useFilePreview } from './use_file_preview';

export const FileAttachmentEvent = ({ file }: { file: DownloadableFile }) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();

  return (
    <>
      {i18n.ADDED}
      <FileNameLink file={file} showPreview={showPreview} />
      {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
    </>
  );
};

FileAttachmentEvent.displayName = 'FileAttachmentEvent';
