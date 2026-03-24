/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type {
  GetAdditionalLinks,
  OpenFileUploadLiteContext,
  ResultLinks,
} from '@kbn/file-upload-common';
import { FileUploadManager } from '../../../file_upload_manager';
import { FileUploadLiteView } from './file_upload_lite_view';
import type { FileUploadStartDependencies } from '../kibana_context';
import { useFileUpload, FileUploadContext } from '../../use_file_upload';

export interface Props {
  dependencies: FileUploadStartDependencies;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
}

export const FileDataVisualizerLite: FC<Props> = ({
  dependencies,
  getAdditionalLinks,
  resultLinks,
  props,
  onClose,
}) => {
  const { data, fileUpload, application, http, notifications, coreStart } = dependencies;

  const {
    existingIndex,
    autoAddInference,
    autoCreateDataView,
    indexSettings,
    onUploadComplete,
    location,
  } = props;
  const fileUploadManager = useMemo(
    () =>
      new FileUploadManager(
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
      ),
    [
      autoAddInference,
      autoCreateDataView,
      data,
      dependencies.analytics,
      dependencies.http,
      dependencies.notifications,
      existingIndex,
      fileUpload,
      indexSettings,
      location,
    ]
  );

  const fileUploadContextValue = useFileUpload(
    fileUploadManager,
    data,
    application,
    http,
    notifications,
    undefined,
    onUploadComplete
  );

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...dependencies }}>
        <FileUploadContext.Provider value={fileUploadContextValue}>
          <FileUploadLiteView
            getAdditionalLinks={getAdditionalLinks}
            resultLinks={resultLinks}
            props={props}
            onClose={onClose}
          />
        </FileUploadContext.Provider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizerLite;
