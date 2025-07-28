/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { EuiImageProps } from '@elastic/eui';
import { EuiFlexGroup, EuiIcon, EuiImage } from '@elastic/eui';
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

const IMAGE_SIZE = '32px';
const componentStyle: EuiImageProps['css'] = {
  cursor: 'pointer',
  width: IMAGE_SIZE,
  height: IMAGE_SIZE,
};
const commonDataTestSubj = 'cases-files-icon';

export const FileIcon = React.memo(
  ({ file }: { file: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType'> }) => {
    const { isPreviewVisible, showPreview, closePreview } = useFilePreview();
    const { client: filesClient } = useFilesContext();
    const { owner } = useCasesContext();

    return (
      <EuiFlexGroup>
        {isImage(file) ? (
          <EuiImage
            src={filesClient.getDownloadHref({
              id: file.id,
              fileKind: constructFileKindIdByOwner(owner[0] as Owner),
            })}
            alt=""
            onClick={showPreview}
            css={componentStyle}
            data-test-subj={`${commonDataTestSubj}-image`}
          />
        ) : (
          <EuiIcon type={getIcon(file.mimeType)} size="xl" data-test-subj={commonDataTestSubj} />
        )}
        {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
      </EuiFlexGroup>
    );
  }
);

FileIcon.displayName = 'FileIcon';
