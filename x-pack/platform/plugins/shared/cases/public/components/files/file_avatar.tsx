/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import { EuiAvatar } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { Owner } from '../../../common/constants/types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { useFilePreview } from './use_file_preview';
import { FilePreview } from './file_preview';
import { useCasesContext } from '../cases_context/use_cases_context';
import { isImage } from './utils';

// eslint-disable-next-line complexity
const getIcon = (extension: string) => {
  switch (extension.toLowerCase()) {
    case 'csv':
    case 'xls':
    case 'xlsx':
      return 'visTable';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'image';
    case 'js':
    case 'ts':
    case 'json':
    case 'xml':
    case 'py':
    case 'html':
      return 'console';
    case 'zip':
    case 'rar':
    case '7z':
      return 'folderClosed';
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return 'document';
    default:
      return 'paperClip';
  }
};

export const FileAvatar = ({
  file,
}: {
  file: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType' | 'extension'>;
}) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();
  const { client: filesClient } = useFilesContext();
  const { owner } = useCasesContext();

  const props = isImage(file)
    ? {
        imageUrl: filesClient.getDownloadHref({
          id: file.id,
          fileKind: constructFileKindIdByOwner(owner[0] as Owner),
        }),
        onClick: showPreview,
        css: { cursor: 'pointer' },
      }
    : {
        iconType: getIcon(file.extension || ''),
        color: 'subdued',
      };

  return (
    <>
      <EuiAvatar name={file.name} type="space" data-test-subj="cases-files-avatar" {...props} />
      {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
    </>
  );
};

FileAvatar.displayName = 'FileAvatar';
