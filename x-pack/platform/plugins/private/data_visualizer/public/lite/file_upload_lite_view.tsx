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
import { EuiButton, EuiFilePicker, EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import useObservable from 'react-use/lib/useObservable';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import type { FileUploadResults } from './flyout/create_flyout';
import { FileManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FileStatus } from './file_status';
import { OverallUploadStatus } from './overall_upload_status';

interface Props {
  dataStart: DataPublicPluginStart;
  http: HttpSetup;
  fileUpload: FileUploadStartApi;
  resultLinks?: ResultLinks;
  capabilities: ApplicationStart['capabilities'];
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddSemanticTextField?: boolean;
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
}) => {
  // const [mode, setMode] = useState<MODE>(MODE.ANALYZE);
  const [indexName, setIndexName] = useState<string>('');
  const [showErrors] = useState<boolean>(false);
  const filePickerRef = useRef<EuiFilePickerClass>(null);
  const fm = useMemo(
    () => new FileManager(fileUpload, http, dataStart.dataViews, autoAddSemanticTextField),
    [autoAddSemanticTextField, dataStart.dataViews, fileUpload, http]
  );
  const deleteFile = useCallback((i: number) => fm.removeFile(i), [fm]);

  const filesStatus = useObservable(fm.analysisStatus$, []);
  const filesOk = useObservable(fm.analysisOk$, false);
  const uploadStatus = useObservable(fm.uploadStatus$, fm.uploadStatus$.getValue());

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
      <>
        <EuiFilePicker
          ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
          id="filePicker"
          fullWidth
          display="large"
          compressed
          multiple
          disabled={uploadStatus.overallImportStatus !== STATUS.NOT_STARTED}
          initialPromptText={i18n.translate(
            'xpack.dataVisualizer.file.aboutPanel.selectOrDragAndDropFileDescription',
            {
              defaultMessage: 'Select or drag and drop a file',
            }
          )}
          onChange={(files) => onFilePickerChange(files)}
        />

        <EuiSpacer />

        <>
          {filesStatus.map((status, i) => (
            <FileStatus
              uploadStatus={uploadStatus}
              fileStatus={status}
              key={i}
              deleteFile={() => deleteFile(i)}
            />
          ))}
        </>

        <EuiSpacer />

        {uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
        filesStatus.length > 0 &&
        filesOk ? (
          <>
            <EuiFormRow label="Index name" isInvalid={showErrors}>
              <EuiFieldText
                value={indexName}
                // disabled={
                //   uploadStatus.overallImportStatus === STATUS.STARTED ||
                //   uploadStatus.overallImportStatus === STATUS.COMPLETED
                // }
                onChange={(e) => setIndexName(e.target.value)}
                placeholder="Index name"
              />
            </EuiFormRow>

            <EuiSpacer />

            <EuiSpacer />
            <EuiButton
              disabled={
                indexName === ''
                // uploadStatus.overallImportStatus === STATUS.STARTED ||
                // uploadStatus.overallImportStatus === STATUS.COMPLETED
              }
              onClick={onImportClick}
            >
              Import
            </EuiButton>
          </>
        ) : null}

        {uploadStatus.overallImportStatus === STATUS.STARTED ||
        uploadStatus.overallImportStatus === STATUS.COMPLETED ? (
          <>
            <OverallUploadStatus uploadStatus={uploadStatus} filesStatus={filesStatus} />
          </>
        ) : null}
      </>
    </>
  );
};
