/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { TrayFile } from './use_file_tray';
import * as i18n from './translations';

interface FileTrayProps {
  trayFile: TrayFile | null;
  trayError: string | null;
  onRemove: () => void;
}

const isImageFile = (file: File) => file.type.startsWith('image/');

const useObjectUrl = (file: File | undefined): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
};

const FilePreviewIcon: React.FC<{ trayFile: TrayFile; previewUrl: string | null }> = ({
  trayFile,
  previewUrl,
}) => {
  if (trayFile.status === 'uploading') {
    return <EuiLoadingSpinner size="m" />;
  }
  if (previewUrl) {
    return <EuiImage src={previewUrl} alt="" size={40} />;
  }
  return <EuiIcon type="document" size="l" aria-hidden={true} />;
};
FilePreviewIcon.displayName = 'FilePreviewIcon';

const getStatusText = ({ status, error }: TrayFile): string | null => {
  if (error) return error.message;
  if (status === 'uploading') return i18n.UPLOADING;
  if (status === 'upload_failed') return i18n.UPLOAD_FAILED;
  return null;
};

/** The file waiting to be sent with the next comment, shown as a removable chip. */
export const FileTray: React.FC<FileTrayProps> = ({ trayFile, trayError, onRemove }) => {
  const previewUrl = useObjectUrl(trayFile?.file);

  if (!trayFile && !trayError) {
    return null;
  }

  const statusText = trayFile ? getStatusText(trayFile) : null;
  const hasError = trayFile?.error != null || trayFile?.status === 'upload_failed';

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="comment-file-tray">
      {trayFile && (
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="s"
            color={hasError ? 'danger' : 'plain'}
            css={{ maxWidth: 360 }}
            data-test-subj="comment-file-tray-chip"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <FilePreviewIcon trayFile={trayFile} previewUrl={previewUrl} />
              </EuiFlexItem>
              <EuiFlexItem css={{ minWidth: 0 }}>
                <EuiText size="s" className="eui-textTruncate">
                  {trayFile.file.name}
                </EuiText>
                {statusText && (
                  <EuiText
                    size="xs"
                    color={hasError ? 'danger' : 'subdued'}
                    data-test-subj="comment-file-tray-status"
                  >
                    {statusText}
                  </EuiText>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.getRemoveFileLabel(trayFile.file.name)}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label={i18n.getRemoveFileLabel(trayFile.file.name)}
                    onClick={onRemove}
                    data-test-subj="comment-file-tray-remove"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}
      {trayError && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="danger" data-test-subj="comment-file-tray-error">
            {trayError}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
FileTray.displayName = 'FileTray';
