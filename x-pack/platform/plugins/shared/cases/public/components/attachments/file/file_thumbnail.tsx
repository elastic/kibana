/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { EuiImageProps } from '@elastic/eui';
import { EuiFlexGroup, EuiImage } from '@elastic/eui';
import type { Owner } from '../../../../common/constants/types';
import { constructFileKindIdByOwner } from '../../../../common/files';
import { useFilePreview } from './use_file_preview';
import { FilePreview } from './file_preview';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { ExternalReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import { getFileFromReferenceMetadata, isValidFileExternalReferenceMetadata } from './utils';

const componentStyle: EuiImageProps['css'] = { cursor: 'pointer' };

export const FileThumbnail = React.memo((props: ExternalReferenceAttachmentViewProps) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();
  const { client: filesClient } = useFilesContext();
  const { owner } = useCasesContext();

  if (!isValidFileExternalReferenceMetadata(props.externalReferenceMetadata)) {
    // This check is done only for TS reasons, externalReferenceMetadata is always FileAttachmentMetadata
    return null;
  }
  const file = getFileFromReferenceMetadata({
    externalReferenceMetadata: props.externalReferenceMetadata,
    fileId: props.externalReferenceId,
  });

  const imageUrl = filesClient.getDownloadHref({
    id: file.id,
    fileKind: constructFileKindIdByOwner(owner[0] as Owner),
  });

  return (
    <EuiFlexGroup>
      <EuiImage
        src={imageUrl}
        alt={file.name}
        size="s"
        data-test-subj="cases-files-image-thumbnail"
        onClick={showPreview}
        css={componentStyle}
      />
      {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
    </EuiFlexGroup>
  );
});

FileThumbnail.displayName = 'FileThumbnail';
