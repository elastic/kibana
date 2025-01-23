/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import type { FileUploadResults } from './flyout/create_flyout';
import { FileManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FileStatus } from './file_status';
import { OverallUploadStatus } from './overall_upload_status';
import { FileClashWarning } from './file_clash_warning';
import { IndexInput } from './index_input';
// import { OverallUploadProgress } from './overall_upload_progress';

interface Props {
  dataStart: DataPublicPluginStart;
  http: HttpSetup;
  fileUpload: FileUploadStartApi;
  resultLinks?: ResultLinks;
  capabilities: ApplicationStart['capabilities'];
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddSemanticTextField?: boolean;
  onClose?: () => void;
}

// enum MODE {
//   ANALYZE,
//   IMPORT,
// }

export const FileUploadLiteView: FC<Props> = ({
  fileUpload,
  http,
  dataStart,
  setUploadResults,
  autoAddSemanticTextField,
  onClose,
}) => {
  // const [mode, setMode] = useState<MODE>(MODE.ANALYZE);
  const [indexName, setIndexName] = useState<string>('');
  const [indexValidationStatus, setIndexValidationStatus] = useState<STATUS>(STATUS.NOT_STARTED);
  // const [showErrors] = useState<boolean>(false);
  const filePickerRef = useRef<EuiFilePickerClass>(null);
  const fm = useMemo(
    () => new FileManager(fileUpload, http, dataStart.dataViews, autoAddSemanticTextField),
    [autoAddSemanticTextField, dataStart.dataViews, fileUpload, http]
  );
  const deleteFile = useCallback((i: number) => fm.removeFile(i), [fm]);

  const filesStatus = useObservable(fm.analysisStatus$, []);
  const filesOk = useObservable(fm.analysisOk$, false);
  const uploadStatus = useObservable(fm.uploadStatus$, fm.uploadStatus$.getValue());
  const fileClashes = useMemo(
    () => uploadStatus.fileClashes.some((f) => f.clash),
    [uploadStatus.fileClashes]
  );

  const onFilePickerChange = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        fm.addFiles(files).then((res) => {
          filePickerRef.current?.removeFiles();
        });
      }
    },
    [fm]
  );

  useEffect(() => {
    return () => {
      fm.destroy();
    };
  }, [fm]);

  const uploadInProgress =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;

  // const onNextClick = useCallback(() => {
  //   // eslint-disable-next-line no-console
  //   console.log('next');
  //   setMode(MODE.IMPORT);
  // }, []);

  // const onBackClick = useCallback(() => {
  //   // eslint-disable-next-line no-console
  //   console.log('back');
  //   setIndexName('');
  //   setMode(MODE.ANALYZE);
  // }, []);

  const onImportClick = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('import');
    fm.import(indexName).then((res) => {
      if (setUploadResults && res) {
        setUploadResults(res);
      }
    });
  }, [fm, indexName, setUploadResults]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.title"
              defaultMessage="Upload a file"
            />
          </h3>
        </EuiTitle>
        {/* <EuiSpacer size="m" />
    <EuiText size="s">
      <FormattedMessage
        id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.secondTitle"
        defaultMessage="Upload a file"
      />
    </EuiText> */}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <>
          <>
            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <>
                <EuiFilePicker
                  ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
                  id="filePicker"
                  fullWidth
                  display="large"
                  compressed
                  multiple
                  initialPromptText={i18n.translate(
                    'xpack.dataVisualizer.file.aboutPanel.selectOrDragAndDropFileDescription',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={(files) => onFilePickerChange(files)}
                />
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
                  />
                ))}

                {fileClashes ? (
                  <FileClashWarning uploadStatus={uploadStatus} filesStatus={filesStatus} />
                ) : null}
                <EuiSpacer />
              </>
            ) : null}

            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
            filesStatus.length > 0 &&
            filesOk ? (
              <>
                <IndexInput
                  setIndexName={setIndexName}
                  setIndexValidationStatus={setIndexValidationStatus}
                  fileUpload={fileUpload}
                />
                {/* <EuiSpacer />

                <EuiSpacer />
                <EuiButton
                  disabled={
                    indexName === '' || indexValidationStatus !== STATUS.COMPLETED
                    // uploadStatus.overallImportStatus === STATUS.STARTED ||
                    // uploadStatus.overallImportStatus === STATUS.COMPLETED
                  }
                  onClick={onImportClick}
                >
                  Import
                </EuiButton> */}
              </>
            ) : null}
            {uploadInProgress ? (
              <>
                {/* <EuiSpacer size="s" /> */}
                {/* {uploadStatus.fileImport === STATUS.STARTED ? (
              <OverallUploadProgress filesStatus={filesStatus} />
            ) : (
              <EuiSpacer size="s" />
            )} */}

                {/* <EuiSpacer size="s" /> */}

                <OverallUploadStatus uploadStatus={uploadStatus} filesStatus={filesStatus} />
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
                id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.closeButton"
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
                      id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.closeButton"
                      defaultMessage="Importing"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <EuiButton
                disabled={indexName === '' || indexValidationStatus !== STATUS.COMPLETED}
                onClick={onImportClick}
              >
                Import
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
