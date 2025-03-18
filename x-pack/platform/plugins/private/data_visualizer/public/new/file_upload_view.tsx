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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import type { FileUploadResults } from '@kbn/file-upload-common';
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
import { useFileUpload } from './use_file_upload';
import { AdvancedSection } from './advanced_section';

interface Props {
  fileUploadManager: FileUploadManager;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  onClose?: () => void;
}

export const FileUploadView: FC<Props> = ({ fileUploadManager, onClose }) => {
  const {
    setIndexName,
    setIndexValidationStatus,
    deleteFile,
    filesStatus,
    uploadStatus,
    fileClashes,
    uploadInProgress,
    onImportClick,
    canImport,
    mappings,
    settings,
  } = useFileUpload(fileUploadManager);

  return (
    <>
      <>
        {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
          <>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.uploadFileDescription"
                  defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index. The data can also be automatically vectorized using semantic text."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <FilePicker fileUploadManager={fileUploadManager} fullWidth={false} />

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
                lite={false}
                setPipeline={fileUploadManager.updatePipeline(i)}
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
        uploadStatus.analysisStatus !== STATUS.FAILED &&
        filesStatus.length > 0 ? (
          <>
            <AdvancedSection
              mappings={mappings.json}
              setMappings={(m) => fileUploadManager.updateMappings(m)}
              settings={settings.json}
              setSettings={(s) => fileUploadManager.updateSettings(s)}
            />

            <EuiSpacer />

            <IndexInput
              setIndexName={setIndexName}
              setIndexValidationStatus={setIndexValidationStatus}
            />
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

      <EuiSpacer />

      <EuiFlexGroup justifyContent="spaceBetween">
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

        <EuiFlexItem grow={true} />

        <EuiFlexItem grow={false}>
          {/* <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.dataVisualizer.file.uploadView.closeButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty> */}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
