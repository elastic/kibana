/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileUploadResults, OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FileUploadLiteFlyoutContents } from './flyout';

interface Props {
  coreStart: CoreStart;
  share: SharePluginStart;
  data: DataPublicPluginStart;
  props: OpenFileUploadLiteContext;
  onFlyoutClose: () => void;
  setUploadResults: (results: FileUploadResults) => void;
}

export const FlyoutContents: FC<Props> = ({
  coreStart,
  share,
  data,
  props: { autoAddInference, autoCreateDataView, indexSettings },
  onFlyoutClose,
  setUploadResults,
}) => {
  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        share,
        data,
      }}
    >
      <FileUploadLiteFlyoutContents
        autoAddInference={autoAddInference}
        autoCreateDataView={autoCreateDataView}
        indexSettings={indexSettings}
        onClose={() => {
          onFlyoutClose();
        }}
        setUploadResults={setUploadResults}
      />
    </KibanaContextProvider>
  );
};
