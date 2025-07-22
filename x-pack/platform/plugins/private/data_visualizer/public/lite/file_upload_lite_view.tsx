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
import React, { useEffect } from 'react';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common/src/types';
import { useFileUploadContext } from '@kbn/file-upload';
import { STATUS } from '@kbn/file-upload';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { FileClashWarning } from './file_clash_warning';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';
import { IndexInput } from './index_input';
import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { DataViewIllustration } from './data_view_illustration';

interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
}

export const FileUploadLiteView: FC<Props> = ({ props, onClose }) => {
  const { flyoutContent } = props;
  const {
    fileUploadManager,
    filesStatus,
    uploadStatus,
    fileClashes,
    fullFileUpload,
    uploadStarted,
    onImportClick,
    canImport,
    setIndexName,
    setIndexValidationStatus,
    deleteFile,
  } = useFileUploadContext();

  useEffect(() => {
    return () => {
      fileUploadManager.destroy();
    };
  }, [fileUploadManager]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            {flyoutContent?.title ? (
              flyoutContent.title
            ) : (
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.uploadFileTitle"
                defaultMessage="Upload a file"
              />
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <>
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
                        />{' '}
                      </>
                    )}
                  </p>
                </EuiText>

                <EuiSpacer />

                <FilePicker fileUploadManager={fileUploadManager} />
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
                    showFileContentPreview={flyoutContent?.showFileContentPreview}
                    showFileSummary={flyoutContent?.showFileSummary}
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
                  <IndexInput
                    setIndexName={setIndexName}
                    setIndexValidationStatus={setIndexValidationStatus}
                  />
                ) : null}
              </>
            ) : null}

            {uploadStarted ? (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem />
                  <EuiFlexItem grow={false}>
                    <DataViewIllustration />
                  </EuiFlexItem>
                  <EuiFlexItem />
                </EuiFlexGroup>

                <EuiSpacer size="xl" />

                <OverallUploadStatus uploadStatus={uploadStatus} filesStatus={filesStatus} />

                {uploadStatus.overallImportStatus === STATUS.FAILED ? (
                  <ImportErrors uploadStatus={uploadStatus} />
                ) : null}
              </>
            ) : null}
          </>
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
