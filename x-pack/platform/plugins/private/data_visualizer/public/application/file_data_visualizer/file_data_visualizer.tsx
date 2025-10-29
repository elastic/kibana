/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FileUploadManager, useFileUpload, FileUploadContext } from '@kbn/file-upload';
import type { FileUploadResults, OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../../common/app';
import { getCoreStart, getPluginsStart } from '../../kibana_services';

import type { GetAdditionalLinks } from '../common/components/results_links';
import { FileUploadView } from './new/file_upload_view';

export interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  props?: OpenFileUploadLiteContext;
}

export type FileDataVisualizerSpec = typeof FileDataVisualizer;

export const FileDataVisualizer: FC<Props> = ({
  getAdditionalLinks,
  resultLinks,
  setUploadResults,
  props,
}) => {
  const coreStart = getCoreStart();
  const { data, maps, embeddable, share, fileUpload, cloud, fieldFormats } = getPluginsStart();
  const services = {
    ...coreStart,
    data,
    maps,
    embeddable,
    share,
    fileUpload,
    fieldFormats,
  };
  const EmptyContext: FC<PropsWithChildren<unknown>> = ({ children }) => <>{children}</>;
  const CloudContext = cloud?.CloudContextProvider || EmptyContext;

  const { autoAddInference, autoCreateDataView, indexSettings } = props ?? {};

  const createFileUploadManager = useCallback(
    (existingIndex?: string) => {
      return new FileUploadManager(
        fileUpload,
        coreStart.http,
        data,
        services.notifications,
        autoAddInference ?? null,
        autoCreateDataView,
        true,
        existingIndex ?? null,
        indexSettings
      );
    },
    [
      autoAddInference,
      autoCreateDataView,
      coreStart.http,
      data,
      fileUpload,
      indexSettings,
      services.notifications,
    ]
  );

  const [fileUploadManager, setFileUploadManager] = useState<FileUploadManager>(() =>
    createFileUploadManager()
  );

  const fileUploadContextValue = useFileUpload(
    fileUploadManager,
    data,
    coreStart.application,
    coreStart.http,
    coreStart.notifications,
    undefined
  );

  const reset = useCallback(
    (existingIndex?: string) => {
      setFileUploadManager(createFileUploadManager(existingIndex));
    },
    [createFileUploadManager]
  );

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...services }}>
        <CloudContext>
          <FileUploadContext.Provider value={fileUploadContextValue}>
            <FileUploadView
              getAdditionalLinks={getAdditionalLinks}
              resultLinks={resultLinks}
              setUploadResults={setUploadResults}
              reset={(existingIndex?: string) => {
                reset(existingIndex);
              }}
            />
          </FileUploadContext.Provider>
        </CloudContext>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizer;
