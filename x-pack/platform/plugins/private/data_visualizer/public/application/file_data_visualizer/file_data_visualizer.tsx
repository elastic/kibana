/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../../common/app';
import { getCoreStart, getPluginsStart } from '../../kibana_services';

// @ts-ignore
import { FileDataVisualizerView } from './components/file_data_visualizer_view';
import type { GetAdditionalLinks } from '../common/components/results_links';
import { FileUploadManager } from '../../new/file_manager';
import { FileUploadView } from '../../new/file_upload_view';

export interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
}

export type FileDataVisualizerSpec = typeof FileDataVisualizer;

enum TEST_MODE {
  OLD,
  NEW,
}

export const FileDataVisualizer: FC<Props> = ({
  getAdditionalLinks,
  resultLinks,
  setUploadResults,
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
  const [mode /* , setMode*/] = useState<TEST_MODE>(TEST_MODE.NEW);

  const EmptyContext: FC<PropsWithChildren<unknown>> = ({ children }) => <>{children}</>;
  const CloudContext = cloud?.CloudContextProvider || EmptyContext;

  const existingIndex = undefined;
  const autoAddInference = undefined;
  const autoCreateDataView = true;
  const indexSettings = undefined;

  const [fileUploadManager, setFileUploadManager] = useState<FileUploadManager | undefined>();

  const reset = useCallback(() => {
    setFileUploadManager(
      new FileUploadManager(
        fileUpload,
        coreStart.http,
        data.dataViews,
        autoAddInference ?? null,
        autoCreateDataView,
        true,
        existingIndex ?? null,
        indexSettings
      )
    );
  }, [
    autoAddInference,
    autoCreateDataView,
    coreStart.http,
    data.dataViews,
    existingIndex,
    fileUpload,
    indexSettings,
  ]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fileUploadManager === undefined) {
    return;
  }

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...services }}>
        <CloudContext>
          {mode === TEST_MODE.NEW ? (
            <FileUploadView
              http={coreStart.http}
              fileUploadManager={fileUploadManager}
              getAdditionalLinks={getAdditionalLinks}
              resultLinks={resultLinks}
              setUploadResults={setUploadResults}
              reset={() => {
                reset();
              }}
              onClose={() => {}}
            />
          ) : (
            <FileDataVisualizerView
              dataStart={data}
              http={coreStart.http}
              fileUpload={fileUpload}
              getAdditionalLinks={getAdditionalLinks}
              resultLinks={resultLinks}
              capabilities={coreStart.application.capabilities}
              setUploadResults={setUploadResults}
            />
          )}
        </CloudContext>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizer;
