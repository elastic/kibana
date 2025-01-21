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

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: AnalyzedFile;
  deleteFile: () => void;
  index: number;
}

export const FileStatus: FC<Props> = ({ fileStatus, uploadStatus, deleteFile, index }) => {
  const clash = uploadStatus.fileClashes[index]?.clash;
  return (
    <React.Fragment>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="s"
        color={clash ? 'danger' : 'transparent'}
      >
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
            {uploadStatus.overallImportStatus === STATUS.STARTED ||
            uploadStatus.overallImportStatus === STATUS.COMPLETED ? (
              <EuiFlexItem grow={true}>
                {fileStatus.importStatus === STATUS.STARTED ||
                fileStatus.importStatus === STATUS.COMPLETED ? (
                  <EuiProgress value={fileStatus.importProgress} max={100} size="s" />
                ) : null}
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={true} />
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
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

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
    </React.Fragment>
  );
};
