/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { STATUS, type UploadStatus } from '../file_manager/file_manager';
import { FileClashResult } from './file_clash';
import { UploadProgress } from './progress';
import { CLASH_ERROR_TYPE } from '../file_manager/merge_tools';

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: FileAnalysis;
  deleteFile: () => void;
  index: number;
}

export const FileStatusLite: FC<Props> = ({ fileStatus, uploadStatus, deleteFile, index }) => {
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;

  const panelColor =
    fileClash.clash === CLASH_ERROR_TYPE.ERROR
      ? 'danger'
      : fileClash.clash === CLASH_ERROR_TYPE.WARNING
      ? 'warning'
      : 'transparent';

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s" color={panelColor}>
        {importStarted ? (
          <UploadProgress fileStatus={fileStatus} />
        ) : (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={8}>
                <EuiText size="xs">
                  <span css={{ fontWeight: 'bold' }}>{fileStatus.fileName}</span>{' '}
                  <span>{fileStatus.fileSize}</span>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={2}>
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={true} />
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      onClick={deleteFile}
                      iconType="trash"
                      size="xs"
                      color="danger"
                      aria-label={i18n.translate(
                        'xpack.dataVisualizer.file.fileStatus.deleteFile',
                        {
                          defaultMessage: 'Remove file',
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <FileClashResult fileClash={fileClash} />
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
