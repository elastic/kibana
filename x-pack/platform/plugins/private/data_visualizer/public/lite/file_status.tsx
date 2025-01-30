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
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileAnalysis } from './file_manager/file_wrapper';
import { STATUS, type UploadStatus } from './file_manager/file_manager';
import { CLASH_TYPE } from './file_manager/merge_tools';

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: FileAnalysis;
  deleteFile: () => void;
  index: number;
}

export const FileStatus: FC<Props> = ({ fileStatus, uploadStatus, deleteFile, index }) => {
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;
  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="s"
        color={fileClash.clash ? 'danger' : 'transparent'}
      >
        {importStarted ? (
          <>
            <EuiProgress
              value={Math.floor(fileStatus.importProgress)}
              max={100}
              size="s"
              label={fileStatus.fileName}
              valueText={true}
              color={fileStatus.importProgress === 100 ? 'success' : 'primary'}
            />
          </>
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

            {fileClash.clash ? (
              <>
                {fileClash.clashType === CLASH_TYPE.FORMAT ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.fileFormatClash"
                        defaultMessage="File format different from other files"
                      />
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.MAPPING ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.mappingClash"
                        defaultMessage="Mappings incompatible with other files"
                      />
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.UNSUPPORTED ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.fileFormatNotSupported"
                        defaultMessage="File format not supported"
                      />
                    </EuiText>
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
