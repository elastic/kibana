/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { CoreStart } from '@kbn/core/public';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { FileUploadLiteView } from './file_upload_lite_view';
import { FileUploadManager } from './file_manager/file_manager';
import type { DataVisualizerStartDependencies } from '../application/common/types/data_visualizer_plugin';

export interface Props {
  coreStart: CoreStart;
  plugins: DataVisualizerStartDependencies;
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
}

export const FileDataVisualizerLite: FC<Props> = ({
  coreStart,
  plugins,
  getAdditionalLinks,
  resultLinks,
  props,
  onClose,
}) => {
  const services = {
    ...coreStart,
    ...plugins,
  };
  const { data, fileUpload, cloud } = services;

  const { existingIndex, autoAddInference, autoCreateDataView, indexSettings } = props;
  const fileUploadManager = useMemo(
    () =>
      new FileUploadManager(
        fileUpload,
        coreStart.http,
        data.dataViews,
        existingIndex ?? null,
        autoAddInference ?? null,
        autoCreateDataView,
        true,
        indexSettings
      ),
    [
      autoAddInference,
      autoCreateDataView,
      coreStart.http,
      data.dataViews,
      existingIndex,
      fileUpload,
      indexSettings,
    ]
  );

  const EmptyContext: FC<PropsWithChildren<unknown>> = ({ children }) => <>{children}</>;
  const CloudContext = cloud?.CloudContextProvider ?? EmptyContext;

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...services }}>
        <CloudContext>
          <FileUploadLiteView
            fileUploadManager={fileUploadManager}
            getAdditionalLinks={getAdditionalLinks}
            resultLinks={resultLinks}
            props={props}
            onClose={onClose}
          />
        </CloudContext>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizerLite;
