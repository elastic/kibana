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
  EuiFilePicker,
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiProgress,
} from '@elastic/eui';
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

enum MODE {
  ANALYZE,
  IMPORT,
}

export const FileUploadLiteView: FC<Props> = ({
  fileUpload,
  http,
  dataStart,
  setUploadResults,
  autoAddSemanticTextField,
}) => {
  const [mode, setMode] = useState<MODE>(MODE.ANALYZE);
  const [indexName, setIndexName] = useState<string>('');
  const [showErrors] = useState<boolean>(false);
  const filePickerRef = useRef<EuiFilePickerClass>(null);
  const fm = useMemo(
    () => new FileManager(fileUpload, http, dataStart.dataViews, autoAddSemanticTextField),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataStart.dataViews, fileUpload, http]
  );
  const fileStatus = useObservable(fm.analysisStatus$, []);
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

  const onNextClick = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('next');
    setMode(MODE.IMPORT);
  }, []);

  const onBackClick = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('back');
    setIndexName('');
    setMode(MODE.ANALYZE);
  }, []);

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
      {mode === MODE.ANALYZE ? (
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

          <>
            {fileStatus.map((status, i) => (
              <div key={i}>
                {status.fileName} - loaded: {status.loaded ? 'true' : 'false'}
              </div>
            ))}
          </>

          <EuiSpacer />

          <EuiButton disabled={!filesOk} onClick={onNextClick}>
            Import
          </EuiButton>
        </>
      ) : (
        <>
          {fileStatus.map((status, i) => (
            <div key={i}>
              {status.fileName}
              <EuiProgress value={status.importProgress} max={100} size="s" />
              <EuiSpacer size="s" />
            </div>
          ))}

          <EuiSpacer />

          <EuiFormRow label="Index name" isInvalid={showErrors}>
            <EuiFieldText
              value={indexName}
              disabled={
                uploadStatus.overallImportStatus === STATUS.STARTED ||
                uploadStatus.overallImportStatus === STATUS.COMPLETED
              }
              onChange={(e) => setIndexName(e.target.value)}
              placeholder="Index name"
            />
          </EuiFormRow>

          <EuiSpacer />

          <EuiButton
            onClick={onBackClick}
            disabled={
              uploadStatus.overallImportStatus === STATUS.STARTED ||
              uploadStatus.overallImportStatus === STATUS.COMPLETED
            }
          >
            Back
          </EuiButton>

          <EuiSpacer />
          <EuiButton
            disabled={
              indexName === '' ||
              uploadStatus.overallImportStatus === STATUS.STARTED ||
              uploadStatus.overallImportStatus === STATUS.COMPLETED
            }
            onClick={onImportClick}
          >
            Import
          </EuiButton>
        </>
      )}
    </>
  );
};
