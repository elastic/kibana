/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type {
  FileUploadResults,
  FindFileStructureResponse,
  GetAdditionalLinks,
  OpenFileUploadLiteContext,
  ResultLinks,
} from '@kbn/file-upload-common';

import { FileUploadView } from './new/file_upload_view';
import type { FileUploadStartDependencies } from './kibana_context';
import { FileUploadManager } from '../../file_upload_manager';
import { useFileUpload, FileUploadContext } from '../use_file_upload';

export interface Props {
  dependencies: FileUploadStartDependencies;
  location: string;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  props?: OpenFileUploadLiteContext;
  getFieldsStatsGrid?: () => React.FC<{ results: FindFileStructureResponse | null }>;
}

export type FileDataVisualizerSpec = typeof FileDataVisualizer;

export const FileDataVisualizer: FC<Props> = ({
  dependencies,
  location,
  getAdditionalLinks,
  resultLinks,
  setUploadResults,
  props,
  getFieldsStatsGrid,
}) => {
  const { data, fileUpload, application, http, notifications, coreStart } = dependencies;
  const { autoAddInference, autoCreateDataView, indexSettings } = props ?? {};

  const createFileUploadManager = useCallback(
    (existingIndex?: string) => {
      return new FileUploadManager(
        {
          analytics: dependencies.analytics,
          data,
          fileUpload,
          http: dependencies.http,
          notifications: dependencies.notifications,
        },
        autoAddInference ?? null,
        autoCreateDataView,
        true,
        existingIndex ?? null,
        indexSettings,
        location
      );
    },
    [autoAddInference, autoCreateDataView, data, dependencies, fileUpload, indexSettings, location]
  );

  const [fileUploadManager, setFileUploadManager] = useState<FileUploadManager>(() =>
    createFileUploadManager()
  );

  const reset = useCallback(
    (existingIndex?: string) => {
      setFileUploadManager(createFileUploadManager(existingIndex));
    },
    [createFileUploadManager]
  );

  const fileUploadContextValue = useFileUpload(
    fileUploadManager,
    data,
    application,
    http,
    notifications,
    getFieldsStatsGrid,
    undefined,
    reset
  );

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...dependencies }}>
        <FileUploadContext.Provider value={fileUploadContextValue}>
          <FileUploadView
            getAdditionalLinks={getAdditionalLinks}
            resultLinks={resultLinks}
            setUploadResults={setUploadResults}
          />
        </FileUploadContext.Provider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizer;
