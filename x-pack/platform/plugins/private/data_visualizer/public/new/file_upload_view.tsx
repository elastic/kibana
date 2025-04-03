/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { HttpSetup } from '@kbn/core/public';
import type { ResultLinks } from '../../common/app';
import {
  ResultsLinks,
  type GetAdditionalLinks,
} from '../application/common/components/results_links';
import { FileClashWarning } from './file_clash_warning';
import type { FileUploadManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';
import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { useFileUpload } from './use_file_upload';
import { AdvancedSection } from './advanced_section';
import { UploadImage } from './upload_image';
import { IndexSelection } from './index_selection';

interface Props {
  http: HttpSetup;
  fileUploadManager: FileUploadManager;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  reset?: () => void;
  onClose?: () => void;
}

export const FileUploadView: FC<Props> = ({ http, fileUploadManager, onClose, reset }) => {
  const {
    indexName,
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
    pipelines,
    importResults,
    dataViewName,
    setDataViewName,
    dataViewNameError,
    indexCreateMode,
    setIndexCreateMode,
    indices,
    existingIndexName,
    setExistingIndexName,
  } = useFileUpload(fileUploadManager, undefined, http);

  const showImportControls =
    uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
    uploadStatus.analysisStatus !== STATUS.FAILED &&
    uploadStatus.analysisStatus !== STATUS.STARTED &&
    filesStatus.length > 0;

  const resetForm = () => {
    reset?.();
  };

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
                pipeline={pipelines[i]!}
                key={i}
                deleteFile={() => deleteFile(i)}
                index={i}
                lite={false}
                setPipeline={fileUploadManager.updatePipeline(i)}
                analyzeFileWithOverrides={fileUploadManager.analyzeFileWithOverrides(i)}
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

        {showImportControls ? (
          <>
            <AdvancedSection
              mappings={mappings.json}
              setMappings={(m) => fileUploadManager.updateMappings(m)}
              settings={settings.json}
              pipelines={pipelines}
              setPipelines={(p) => fileUploadManager.updatePipelines(p)}
              setSettings={(s) => fileUploadManager.updateSettings(s)}
              indexName={indexName}
              dataViewName={dataViewName}
              setDataViewName={setDataViewName}
              dataViewNameError={dataViewNameError}
              results={2}
              filesStatus={filesStatus}
              indexCreateMode={indexCreateMode}
            />

            <EuiSpacer />

            <IndexSelection
              setIndexName={setIndexName}
              setIndexValidationStatus={setIndexValidationStatus}
              initialIndexName={indexName}
              indexCreateMode={indexCreateMode}
              setIndexCreateMode={setIndexCreateMode}
              indices={indices}
              existingIndexName={existingIndexName}
              setExistingIndexName={setExistingIndexName}
            />
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

      <EuiSpacer />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {showImportControls ? (
            <EuiButton disabled={canImport === false} onClick={onImportClick}>
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.importButton"
                defaultMessage="Import"
              />
            </EuiButton>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow={true} />
      </EuiFlexGroup>

      {uploadStatus.overallImportStatus === STATUS.COMPLETED && importResults !== null ? (
        <>
          <EuiButton onClick={resetForm}>
            <FormattedMessage
              id="xpack.dataVisualizer.file.uploadView.importButton"
              defaultMessage="Upload another file"
            />
          </EuiButton>

          <EuiSpacer />

          <ResultsLinks
            index={importResults.index}
            dataViewId={importResults.dataView?.id}
            timeFieldName={importResults.timeFieldName}
            createDataView={importResults.dataView?.id !== undefined}
            getAdditionalLinks={[]}
            resultLinks={undefined}
          />
        </>
      ) : null}
    </>
  );
};
