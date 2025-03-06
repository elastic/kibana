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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { FileClashWarning } from './file_clash_warning';
import type { FileUploadManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';
import { IndexInput } from './index_input';
import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { DataViewIllustration } from './data_view_illustration';
import { useDataVisualizerKibana } from '../application/kibana_context';
import { CLASH_ERROR_TYPE } from './file_manager/merge_tools';

interface Props {
  fileUploadManager: FileUploadManager;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
}

export const FileUploadLiteView: FC<Props> = ({ fileUploadManager, props, onClose }) => {
  const {
    services: {
      application: { navigateToApp },
    },
  } = useDataVisualizerKibana();

  const { flyoutContent, onUploadComplete, initialIndexName } = props;

  const [indexName, setIndexName] = useState<string>(
    fileUploadManager.getExistingIndexName() ?? ''
  );
  const [indexValidationStatus, setIndexValidationStatus] = useState<STATUS>(
    fileUploadManager.getExistingIndexName() ? STATUS.COMPLETED : STATUS.NOT_STARTED
  );

  const deleteFile = useCallback(
    (i: number) => fileUploadManager.removeFile(i),
    [fileUploadManager]
  );

  const filesStatus = useObservable(fileUploadManager.fileAnalysisStatus$, []);
  const uploadStatus = useObservable(
    fileUploadManager.uploadStatus$,
    fileUploadManager.uploadStatus$.getValue()
  );
  const fileClashes = useMemo(
    () => uploadStatus.fileClashes.some((f) => f.clash === CLASH_ERROR_TYPE.ERROR),
    [uploadStatus.fileClashes]
  );

  const fullFileUpload = useCallback(
    () => navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' }),
    [navigateToApp]
  );

  useEffect(() => {
    return () => {
      fileUploadManager.destroy();
    };
  }, [fileUploadManager]);

  const uploadInProgress =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED ||
    uploadStatus.overallImportStatus === STATUS.FAILED;

  const onImportClick = useCallback(() => {
    fileUploadManager.import(indexName).then((res) => {
      if (onUploadComplete && res) {
        onUploadComplete(res);
      }
    });
  }, [fileUploadManager, indexName, onUploadComplete]);

  const canImport = useMemo(() => {
    return (
      uploadStatus.analysisOk && indexValidationStatus === STATUS.COMPLETED && indexName !== ''
    );
  }, [indexName, indexValidationStatus, uploadStatus.analysisOk]);

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
          uploadStatus.analysisOk ? (
            <>
              {fileUploadManager.isExistingIndexUpload() === false ? (
                <IndexInput
                  setIndexName={setIndexName}
                  setIndexValidationStatus={setIndexValidationStatus}
                  initialIndexName={initialIndexName}
                />
              ) : null}
            </>
          ) : null}
          {uploadInProgress ? (
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
