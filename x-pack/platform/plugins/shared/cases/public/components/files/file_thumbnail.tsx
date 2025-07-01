/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import { EuiAvatar, EuiImage } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { Owner } from '../../../common/constants/types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { useFilePreview } from './use_file_preview';
import { FilePreview } from './file_preview';
import { useCasesContext } from '../cases_context/use_cases_context';

export const FileThumbnail = ({
  file,
  compact = false,
}: {
  file: Pick<FileJSON<unknown>, 'id' | 'name'>;
  compact?: boolean;
}) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();
  const { client: filesClient } = useFilesContext();
  const { owner } = useCasesContext();

  const imageUrl = filesClient.getDownloadHref({
    id: file.id,
    fileKind: constructFileKindIdByOwner(owner[0] as Owner),
  });

  const commonProps = { onClick: showPreview, css: { cursor: 'pointer' } };
  const commonDataTestSubj = 'cases-files-image-thumbnail';

  return (
    <>
      {compact ? (
        <EuiAvatar
          imageUrl={imageUrl}
          name={file.name}
          type="space"
          data-test-subj={`${commonDataTestSubj}-compact`}
          {...commonProps}
        />
      ) : (
        <EuiImage
          src={imageUrl}
          alt={file.name}
          size="s"
          data-test-subj={commonDataTestSubj}
          {...commonProps}
        />
      )}
      {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
    </>
  );
};

FileThumbnail.displayName = 'FileThumbnail';
