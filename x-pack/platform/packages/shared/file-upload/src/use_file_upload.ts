/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { Index } from '@kbn/index-management-shared-types/src/types';
import type { ApplicationStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileUploadResults } from '@kbn/file-upload-common';
import useMountedState from 'react-use/lib/useMountedState';
import { CLASH_ERROR_TYPE, FileUploadManager, STATUS } from '../file_upload_manager';

export enum UPLOAD_TYPE {
  NEW = 'new',
  EXISTING = 'existing',
}

export function useFileUpload(
  fileUploadManager: FileUploadManager,
  data: DataPublicPluginStart,
  application: ApplicationStart,
  http: HttpSetup,
  notifications: NotificationsStart,
  onUploadComplete?: (results: FileUploadResults | null) => void
) {
  const isMounted = useMountedState();
  const { dataViews } = data;
  const { navigateToApp } = application;

  const [importResults, setImportResults] = useState<FileUploadResults | null>(null);
  const [indexCreateMode, setIndexCreateMode] = useState<UPLOAD_TYPE>(UPLOAD_TYPE.NEW);
  const [indices, setIndices] = useState<Index[]>([]);

  const [indexName, setIndexName] = useState<string>(
    fileUploadManager.getExistingIndexName() ?? ''
  );
  const [dataViewName, setDataViewName] = useState<string | null>(
    fileUploadManager.getAutoCreateDataView() ? '' : null
  );

  const [existingDataViewNames, setExistingDataViewNames] = useState<string[]>([]);

  const [dataViewNameError, setDataViewNameError] = useState<string>('');

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
    fileUploadManager.getUploadStatus()
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
    if (http === undefined) {
      return;
    }

    http.get<Index[]>('/api/index_management/indices').then((indx) => {
      if (!isMounted()) {
        return;
      }
      setIndices(indx.filter((i) => i.hidden === false && i.isFrozen === false));
    });
  }, [http, fileUploadManager, isMounted]);

  useEffect(() => {
    dataViews.getTitles().then((titles) => {
      if (!isMounted()) {
        return;
      }
      setExistingDataViewNames(titles);
    });
  }, [dataViews, isMounted]);

  useEffect(() => {
    return () => {
      fileUploadManager.destroy();
    };
  }, [fileUploadManager]);

  useEffect(() => {
    if (dataViewName === null || dataViewName === '') {
      setDataViewNameError('');
      return;
    }

    setDataViewNameError(isDataViewNameValid(dataViewName, existingDataViewNames, indexName));
  }, [dataViewName, existingDataViewNames, indexName]);

  const uploadStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED ||
    uploadStatus.overallImportStatus === STATUS.FAILED;

  const onImportClick = useCallback(async () => {
    const existingIndex = fileUploadManager.getExistingIndexName();
    const index = existingIndex !== null ? existingIndex : indexName;
    const dv = dataViewName === '' ? undefined : dataViewName;
    try {
      const res = await fileUploadManager.import(index, dv);
      if (!isMounted()) {
        return;
      }
      if (onUploadComplete && res) {
        onUploadComplete(res);
      }
      setImportResults(res);
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.dataVisualizer.file.importView.importErrorNotificationTitle', {
          defaultMessage: 'Error performing import',
        }),
      });
    }
  }, [
    dataViewName,
    fileUploadManager,
    indexName,
    isMounted,
    notifications.toasts,
    onUploadComplete,
  ]);

  const existingIndexName = useObservable(
    fileUploadManager.existingIndexName$,
    fileUploadManager.getExistingIndexName()
  );

  const canImport = useMemo(() => {
    return (
      uploadStatus.analysisStatus === STATUS.COMPLETED &&
      indexValidationStatus === STATUS.COMPLETED &&
      ((existingIndexName === null && indexName !== '') || existingIndexName !== null) &&
      uploadStatus.mappingsJsonValid === true &&
      uploadStatus.settingsJsonValid === true &&
      uploadStatus.pipelinesJsonValid === true &&
      dataViewNameError === ''
    );
  }, [
    dataViewNameError,
    indexName,
    indexValidationStatus,
    uploadStatus.analysisStatus,
    uploadStatus.mappingsJsonValid,
    uploadStatus.pipelinesJsonValid,
    uploadStatus.settingsJsonValid,
    existingIndexName,
  ]);

  const mappings = useObservable(fileUploadManager.mappings$, fileUploadManager.getMappings());
  const settings = useObservable(fileUploadManager.settings$, fileUploadManager.getSettings());

  const setExistingIndexName = useCallback(
    (idxName: string | null) => {
      fileUploadManager.setExistingIndexName(idxName);
    },
    [fileUploadManager]
  );

  useEffect(() => {
    setIndexName('');
    setExistingIndexName(null);
  }, [indexCreateMode, setExistingIndexName]);

  const pipelines = useObservable(fileUploadManager.filePipelines$, []);

  return {
    fileUploadManager,
    indexName,
    setIndexName,
    indexValidationStatus,
    setIndexValidationStatus,
    deleteFile,
    filesStatus,
    uploadStatus,
    fileClashes,
    fullFileUpload,
    uploadStarted,
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
  };
}

function isDataViewNameValid(name: string, dataViewNames: string[], index: string) {
  // if a blank name is entered, the index name will be used so avoid validation
  if (name === '') {
    return '';
  }

  if (dataViewNames.find((i) => i === name)) {
    return i18n.translate(
      'xpack.dataVisualizer.file.importView.dataViewNameAlreadyExistsErrorMessage',
      {
        defaultMessage: 'Data view name already exists',
      }
    );
  }

  // escape . and + to stop the regex matching more than it should.
  let newName = name.replace(/\./g, '\\.');
  newName = newName.replace(/\+/g, '\\+');
  // replace * with .* to make the wildcard match work.
  newName = newName.replace(/\*/g, '.*');
  const reg = new RegExp(`^${newName}$`);
  if (index.match(reg) === null) {
    // name should match index
    return i18n.translate(
      'xpack.dataVisualizer.file.importView.indexPatternDoesNotMatchDataViewErrorMessage',
      {
        defaultMessage: 'Data view does not match index name',
      }
    );
  }

  return '';
}

type FileUploadContextValue = ReturnType<typeof useFileUpload>;

export const FileUploadContext = createContext<FileUploadContextValue | undefined>(undefined);

export const useFileUploadContext = (): FileUploadContextValue => {
  const fileUploadContext = useContext(FileUploadContext);

  // if `undefined`, throw an error
  if (fileUploadContext === undefined) {
    throw new Error('useFileUploadContext was used outside of its Provider');
  }

  return fileUploadContext;
};
