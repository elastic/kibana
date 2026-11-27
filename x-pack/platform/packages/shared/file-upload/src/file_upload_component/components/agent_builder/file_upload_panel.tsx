/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  FILE_UPLOAD_AGENT_BUILDER_LOCATION,
  type FileUploadResults,
} from '@kbn/file-upload-common';
import { FileUploadManager, STATUS } from '../../../../file_upload_manager';
import { FileUploadContext, useFileUpload, useFileUploadContext } from '../../../use_file_upload';
import type { FileUploadStartDependencies } from '../../kibana_context';
import { FilePicker } from '../file_picker';
import { FileStatus } from '../file_status';
import { FileClashWarning } from '../file_clash_warning';
import { IndexInput } from '../index_selection/index_input';
import { UploadImage } from '../upload_image';
import { OverallUploadStatus } from '../overall_upload_status';
import { ImportErrors } from '../import_errors';

export interface FileUploadPanelProps {
  dependencies: FileUploadStartDependencies;
  /** Index the user already uploaded into, when the panel is reopened after an upload. */
  uploadedIndex?: string;
  suggestedIndexName?: string;
  onUploadComplete: (results: FileUploadResults) => void;
  closeCanvas: () => void;
}

const importLabel = i18n.translate('xpack.fileUpload.agentBuilder.panel.importButton', {
  defaultMessage: 'Import',
});
const cancelLabel = i18n.translate('xpack.fileUpload.agentBuilder.panel.cancelButton', {
  defaultMessage: 'Cancel',
});
const doneLabel = i18n.translate('xpack.fileUpload.agentBuilder.panel.doneButton', {
  defaultMessage: 'Done',
});

type PanelViewProps = Pick<FileUploadPanelProps, 'suggestedIndexName' | 'closeCanvas'>;

const FileUploadPanelView: FC<PanelViewProps> = ({ suggestedIndexName, closeCanvas }) => {
  const {
    fileUploadManager,
    filesStatus,
    uploadStatus,
    fileClashes,
    uploadStarted,
    onImportClick,
    canImport,
    abortImport,
    setIndexName,
    setIndexValidationStatus,
  } = useFileUploadContext();
  const { overallImportStatus, analysisStatus } = uploadStatus;

  if (uploadStarted) {
    return (
      <>
        <UploadImage />
        <EuiSpacer size="xl" />
        <OverallUploadStatus />
        {overallImportStatus === STATUS.FAILED ? <ImportErrors /> : null}
        <EuiSpacer />
        {overallImportStatus === STATUS.STARTED ? (
          <EuiButton onClick={abortImport} data-test-subj="fileUploadPanelCancelButton">
            {cancelLabel}
          </EuiButton>
        ) : (
          <EuiButton fill onClick={closeCanvas} data-test-subj="fileUploadPanelDoneButton">
            {doneLabel}
          </EuiButton>
        )}
      </>
    );
  }

  return (
    <>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.fileUpload.agentBuilder.panel.description', {
            defaultMessage:
              'Upload your file, analyze its data, and import the data into a new Elasticsearch index.',
          })}
        </p>
      </EuiText>
      <EuiSpacer />
      <FilePicker
        fileUploadManager={fileUploadManager}
        fullWidth={true}
        large={filesStatus.length === 0}
      />
      <EuiSpacer />
      {filesStatus.map((status, i) => (
        <FileStatus
          key={i}
          index={i}
          lite={true}
          showOverrideButton={false}
          showSettingsButton={false}
        />
      ))}
      {fileClashes ? <FileClashWarning /> : null}
      {filesStatus.length > 0 && analysisStatus !== STATUS.NOT_STARTED ? (
        <>
          <EuiSpacer />
          <IndexInput
            setIndexName={setIndexName}
            setIndexValidationStatus={setIndexValidationStatus}
            initialIndexName={suggestedIndexName}
          />
          <EuiSpacer />
          <EuiButton
            fill
            iconType="download"
            disabled={canImport === false}
            onClick={onImportClick}
            data-test-subj="fileUploadPanelImportButton"
          >
            {importLabel}
          </EuiButton>
        </>
      ) : null}
    </>
  );
};

type PanelContentsProps = Omit<FileUploadPanelProps, 'uploadedIndex'>;

const FileUploadPanelContents: FC<PanelContentsProps> = ({
  dependencies,
  suggestedIndexName,
  onUploadComplete,
  closeCanvas,
}) => {
  const { data, application, http, notifications, analytics, fileUpload } = dependencies;

  const fileUploadManager = useMemo(
    () =>
      new FileUploadManager(
        {
          analytics,
          data,
          fileUpload,
          http,
          notifications,
          capabilities: application.capabilities,
        },
        null,
        true,
        true,
        null,
        undefined,
        FILE_UPLOAD_AGENT_BUILDER_LOCATION
      ),
    [analytics, data, fileUpload, http, notifications, application.capabilities]
  );

  const handleUploadComplete = useCallback(
    (results: FileUploadResults | null) => {
      if (results) {
        onUploadComplete(results);
      }
    },
    [onUploadComplete]
  );

  const fileUploadContextValue = useFileUpload(
    fileUploadManager,
    data,
    application,
    http,
    notifications,
    undefined,
    handleUploadComplete
  );

  return (
    <KibanaContextProvider services={{ ...dependencies }}>
      <FileUploadContext.Provider value={fileUploadContextValue}>
        <FileUploadPanelView suggestedIndexName={suggestedIndexName} closeCanvas={closeCanvas} />
      </FileUploadContext.Provider>
    </KibanaContextProvider>
  );
};

/** Card-sized file upload UI rendered in the Agent Builder side panel. */
export const FileUploadPanel: FC<FileUploadPanelProps> = ({ uploadedIndex, ...props }) => {
  // Only decided on mount: saving the origin mid-session must not swap out the results view.
  const [initialUploadedIndex] = useState(uploadedIndex);

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      {initialUploadedIndex !== undefined ? (
        <EuiText size="s">
          <p data-test-subj="fileUploadPanelAlreadyUploaded">
            {i18n.translate('xpack.fileUpload.agentBuilder.panel.alreadyUploaded', {
              defaultMessage: 'Data has already been uploaded to the index {index}.',
              values: { index: initialUploadedIndex },
            })}
          </p>
        </EuiText>
      ) : (
        <FileUploadPanelContents {...props} />
      )}
    </EuiPanel>
  );
};
