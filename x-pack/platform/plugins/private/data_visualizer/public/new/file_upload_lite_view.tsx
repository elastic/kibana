/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { FileClashWarning } from './file_clash_warning';
import type { FileUploadManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';

import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { useFileUpload } from './use_file_upload';
import { UploadImage } from './upload_image';
import { IndexSelection } from './index_selection';

interface Props {
  fileUploadManager: FileUploadManager;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
}

export const FileUploadLiteView: FC<Props> = ({ fileUploadManager, props, onClose }) => {
  const { flyoutContent, initialIndexName, onUploadComplete } = props;
  const {
    setIndexName,
    setIndexValidationStatus,
    deleteFile,
    filesStatus,
    uploadStatus,
    fileClashes,
    fullFileUpload,
    uploadInProgress,
    onImportClick,
    canImport,
    indices,
  } = useFileUpload(fileUploadManager, onUploadComplete);

  const existingIndexName = fileUploadManager.getExistingIndexName();

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            {flyoutContent?.title ? (
              flyoutContent.title
            ) : existingIndexName ? (
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.uploadFileTitle"
                defaultMessage="Upload files to {indexName}"
                values={{ indexName: existingIndexName }}
              />
            ) : (
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.uploadFileTitle"
                defaultMessage="Upload files"
              />
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <>
          {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
            <>
              <EuiText>
                <p>
                  {flyoutContent?.description ? (
                    flyoutContent.description
                  ) : (
                    <>
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.uploadView.uploadFileDescription"
                        defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index. The data can also be automatically vectorized using semantic text."
                      />

                      {existingIndexName === null ? (
                        <>
                          <br />

                          <FormattedMessage
                            id="xpack.dataVisualizer.file.uploadView.uploadFileDescriptionLink"
                            defaultMessage="If you need to customize the file upload process, the full version is available {fullToolLink}."
                            values={{
                              fullToolLink: (
                                <EuiLink onClick={fullFileUpload}>
                                  <FormattedMessage
                                    id="xpack.dataVisualizer.file.uploadView.uploadFileDescriptionLinkText"
                                    defaultMessage="here"
                                  />
                                </EuiLink>
                              ),
                            }}
                          />
                        </>
                      ) : null}
                    </>
                  )}
                </p>
              </EuiText>

              <EuiSpacer />

              <FilePicker fileUploadManager={fileUploadManager} fullWidth={true} />

              <EuiSpacer />
            </>
          ) : null}

          {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
            <>
              {filesStatus.map((status, i) => (
                <FileStatus
                  uploadStatus={uploadStatus}
                  fileStatus={status}
                  key={i}
                  deleteFile={() => deleteFile(i)}
                  index={i}
                  lite={true}
                  showFileContentPreview={flyoutContent?.showFileContentPreview}
                  showFileSummary={flyoutContent?.showFileSummary}
                  autoExpand={filesStatus.length === 1}
                />
              ))}

              {fileClashes ? (
                <FileClashWarning
                  uploadStatus={uploadStatus}
                  filesStatus={filesStatus}
                  removeClashingFiles={() => fileUploadManager.removeClashingFiles()}
                />
              ) : null}
              <EuiSpacer />
            </>
          ) : null}

          {uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
          filesStatus.length > 0 &&
          uploadStatus.analysisStatus !== STATUS.NOT_STARTED ? (
            <>
              {fileUploadManager.isExistingIndexUpload() === false ? (
                <IndexSelection
                  setIndexName={setIndexName}
                  setIndexValidationStatus={setIndexValidationStatus}
                  initialIndexName={initialIndexName}
                  indices={indices}
                />
              ) : null}
            </>
          ) : null}
          {uploadInProgress ? (
            <>
              <UploadImage />

              <EuiSpacer size="xl" />

              <OverallUploadStatus uploadStatus={uploadStatus} filesStatus={filesStatus} />

              {uploadStatus.overallImportStatus === STATUS.FAILED ? (
                <ImportErrors uploadStatus={uploadStatus} />
              ) : null}
            </>
          ) : null}
        </>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            {uploadStatus.overallImportStatus === STATUS.STARTED ? (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty onClick={onClose} disabled={true}>
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.uploadView.importingButton"
                      defaultMessage="Importing"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <EuiButton disabled={canImport === false} onClick={onImportClick}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.importButton"
                  defaultMessage="Import"
                />
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
