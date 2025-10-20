/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import { useFileUploadContext, STATUS } from '@kbn/file-upload';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../../../common/app';
import { FileClashWarning } from './file_clash_warning';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';
import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { AdvancedSection } from './advanced_section';
import { UploadImage } from './upload_image';
import { IndexSelection } from './index_selection';
import type { GetAdditionalLinks } from '../../common/components/results_links';
import { ResultsLinks } from '../../common/components/results_links';

interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  reset?: (existingIndex?: string) => void;
}

export const FileUploadView: FC<Props> = ({ reset, getAdditionalLinks }) => {
  const {
    fileUploadManager,
    filesStatus,
    uploadStatus,
    fileClashes,
    uploadStarted,
    onImportClick,
    canImport,
    importResults,
    indexName,
  } = useFileUploadContext();

  const showImportControls =
    uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
    uploadStatus.analysisStatus !== STATUS.FAILED &&
    uploadStatus.analysisStatus !== STATUS.STARTED &&
    filesStatus.length > 0;

  const resetForm = (reuseIndex: boolean = false) => {
    reset?.(reuseIndex ? indexName : undefined);
  };

  return (
    <div data-test-subj="dataVisualizerPageFileUpload">
      <>
        {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
          <>
            <IndexSelection />

            <EuiSpacer />

            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.uploadFilesTitle"
                  defaultMessage="Upload files"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="xs" />

            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.uploadFileDescription"
                  defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
                />
              </p>
            </EuiText>

            <EuiSpacer size="xs" />

            <FilePicker
              fileUploadManager={fileUploadManager}
              fullWidth={true}
              large={filesStatus.length === 0}
            />

            <EuiSpacer />

            {filesStatus.map((status, i) => (
              <FileStatus key={i} index={i} lite={false} showOverrideButton={true} />
            ))}

            {fileClashes ? <FileClashWarning /> : null}
            <EuiSpacer />
          </>
        ) : null}

        {showImportControls ? <AdvancedSection /> : null}

        {uploadStarted ? (
          <>
            <UploadImage />

            <EuiSpacer size="xl" />

            <OverallUploadStatus />

            {uploadStatus.overallImportStatus === STATUS.FAILED ? <ImportErrors /> : null}
          </>
        ) : null}
      </>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {showImportControls ? (
            <EuiButton
              disabled={canImport === false}
              onClick={onImportClick}
              data-test-subj="fileUploadImportButton"
            >
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
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => resetForm()}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.importAnotherButton"
                  defaultMessage="Upload another file"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => resetForm(true)}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.importAnotherButton"
                  defaultMessage="Upload file to same index"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          <ResultsLinks
            index={importResults.index}
            dataViewId={importResults.dataView?.id}
            timeFieldName={importResults.timeFieldName}
            createDataView={importResults.dataView?.id !== undefined}
            getAdditionalLinks={getAdditionalLinks}
            resultLinks={undefined}
          />
        </>
      ) : null}
    </div>
  );
};
