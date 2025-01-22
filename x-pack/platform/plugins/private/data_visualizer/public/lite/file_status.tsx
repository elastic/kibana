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
import type { AnalyzedFile } from './file_manager/file_wrapper';
import { STATUS, type UploadStatus } from './file_manager/file_manager';
import { CLASH_TYPE } from './file_manager/merge_tools';

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: AnalyzedFile;
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
              {/* <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <span>{fileStatus.fileSize}</span>
            </EuiText>
          </EuiFlexItem> */}
              <EuiFlexItem grow={2}>
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={true} />
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      onClick={deleteFile}
                      iconType="trash"
                      size="xs"
                      color="danger"
                      aria-label="remove file"
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
                      format clash
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.MAPPING ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      mapping clash
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.UNSUPPORTED ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      unsupported format
                    </EuiText>
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}

        {/* <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              disabled={uploadStatus.overallImportStatus !== STATUS.NOT_STARTED}
              onClick={deleteFile}
              iconType="trash"
              size="xs"
              color="danger"
              aria-label="remove file"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {uploadStatus.overallImportStatus === STATUS.STARTED ||
        uploadStatus.overallImportStatus === STATUS.COMPLETED ? (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiProgress
                  label={'Importing'}
                  valueText={true}
                  value={Math.floor(fileStatus.importProgress)}
                  max={100}
                  size="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null} */}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
