/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useFilesContext } from '@kbn/shared-ux-file-context';

import type { Owner } from '../../../common/constants/types';

import { constructFileKindIdByOwner } from '../../../common/files';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

interface FileDownloadButtonProps {
  fileId: string;
  isIcon?: boolean;
}

const FileDownloadButtonComponent: React.FC<FileDownloadButtonProps> = ({ fileId, isIcon }) => {
  const { owner } = useCasesContext();
  const { client: filesClient } = useFilesContext();

  const buttonProps = {
    iconType: 'download',
    'aria-label': i18n.DOWNLOAD_FILE,
    href: filesClient.getDownloadHref({
      fileKind: constructFileKindIdByOwner(owner[0] as Owner),
      id: fileId,
    }),
    'data-test-subj': 'cases-files-download-button',
  };

  return isIcon ? (
    <EuiButtonIcon {...buttonProps} />
  ) : (
    <EuiButtonEmpty {...buttonProps}>{i18n.DOWNLOAD_FILE}</EuiButtonEmpty>
  );
};
FileDownloadButtonComponent.displayName = 'FileDownloadButton';

export const FileDownloadButton = React.memo(FileDownloadButtonComponent);
