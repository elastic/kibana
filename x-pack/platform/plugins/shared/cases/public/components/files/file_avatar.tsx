/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import { EuiAvatar, EuiFlexItem } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import {
  compressionMimeTypes,
  pdfMimeTypes,
  textMimeTypes,
} from '../../../common/constants/mime_types';
import type { Owner } from '../../../common/constants/types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { useFilePreview } from './use_file_preview';
import { FilePreview } from './file_preview';
import { useCasesContext } from '../cases_context/use_cases_context';
import { isImage } from './utils';

const DEFAULT_ICON = 'paperClip';
const getIcon = (mimeType: string | undefined) => {
  if (typeof mimeType === 'undefined') {
    return DEFAULT_ICON;
  }

  if (textMimeTypes.includes(mimeType) || pdfMimeTypes.includes(mimeType)) {
    return 'document';
  }

  if (compressionMimeTypes.includes(mimeType)) {
    return 'folderClosed';
  }

  return DEFAULT_ICON;
};

export const FileAvatar = React.memo(
  ({ file }: { file: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType'> }) => {
    const { isPreviewVisible, showPreview, closePreview } = useFilePreview();
    const { client: filesClient } = useFilesContext();
    const { owner } = useCasesContext();

    const props = useMemo(() => {
      return isImage(file)
        ? {
            imageUrl: filesClient.getDownloadHref({
              id: file.id,
              fileKind: constructFileKindIdByOwner(owner[0] as Owner),
            }),
            onClick: showPreview,
            css: { cursor: 'pointer' },
          }
        : {
            iconType: getIcon(file.mimeType),
            color: 'subdued',
            iconSize: 'l' as const,
          };
    }, [file, filesClient, owner, showPreview]);

    return (
      <EuiFlexItem grow={false}>
        <EuiAvatar name={file.name} type="space" data-test-subj="cases-files-avatar" {...props} />
        {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
      </EuiFlexItem>
    );
  }
);

FileAvatar.displayName = 'FileAvatar';
