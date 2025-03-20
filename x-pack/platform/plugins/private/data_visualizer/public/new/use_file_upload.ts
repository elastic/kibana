/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FileUploadResults } from '@kbn/file-upload-common';
import useObservable from 'react-use/lib/useObservable';
import type { FileUploadManager } from './file_manager/file_manager';
import { STATUS } from './file_manager/file_manager';
import { CLASH_ERROR_TYPE } from './file_manager/merge_tools';
import { useDataVisualizerKibana } from '../application/kibana_context';

export function useFileUpload(
  fileUploadManager: FileUploadManager,
  onUploadComplete?: (results: FileUploadResults | null) => void
) {
  const {
    services: {
      application: { navigateToApp },
    },
  } = useDataVisualizerKibana();

  const [importResults, setImportResults] = useState<FileUploadResults | null>(null);

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
      setImportResults(res);
    });
  }, [fileUploadManager, indexName, onUploadComplete]);

  const canImport = useMemo(() => {
    return (
      uploadStatus.analysisStatus === STATUS.COMPLETED &&
      indexValidationStatus === STATUS.COMPLETED &&
      indexName !== '' &&
      uploadStatus.mappingsJsonValid === true &&
      uploadStatus.settingsJsonValid === true &&
      uploadStatus.pipelinesJsonValid === true
    );
  }, [
    indexName,
    indexValidationStatus,
    uploadStatus.analysisStatus,
    uploadStatus.mappingsJsonValid,
    uploadStatus.pipelinesJsonValid,
    uploadStatus.settingsJsonValid,
  ]);

  const mappings = useObservable(
    fileUploadManager.mappings$,
    fileUploadManager.mappings$.getValue()
  );
  const settings = useObservable(
    fileUploadManager.settings$,
    fileUploadManager.settings$.getValue()
  );

  return {
    indexName,
    setIndexName,
    indexValidationStatus,
    setIndexValidationStatus,
    deleteFile,
    filesStatus,
    uploadStatus,
    fileClashes,
    fullFileUpload,
    uploadInProgress,
    onImportClick,
    canImport,
    mappings,
    settings,
    importResults,
  };
}
