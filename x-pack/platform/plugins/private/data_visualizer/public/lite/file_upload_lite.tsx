/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { getCoreStart, getPluginsStart } from '../kibana_services';
import { FileUploadLiteView } from './file_upload_lite_view';

export interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddInference?: string;
  autoCreateDataView?: boolean;
  indexSettings?: IndicesIndexSettings;
  onClose?: () => void;
}

export const FileDataVisualizerLite: FC<Props> = ({
  getAdditionalLinks,
  resultLinks,
  setUploadResults,
  autoAddInference,
  autoCreateDataView,
  indexSettings,
  onClose,
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
  const CloudContext = cloud?.CloudContextProvider ?? EmptyContext;

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...services }}>
        <CloudContext>
          <FileUploadLiteView
            dataStart={data}
            http={coreStart.http}
            fileUpload={fileUpload}
            getAdditionalLinks={getAdditionalLinks}
            resultLinks={resultLinks}
            capabilities={coreStart.application.capabilities}
            setUploadResults={setUploadResults}
            autoAddInference={autoAddInference}
            autoCreateDataView={autoCreateDataView}
            indexSettings={indexSettings}
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
