/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import type { DatasetQualityController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { DatasetQualityContextProvider, useDatasetQualityContext } from './context';

export const DatasetQualityRoute = () => {
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const {
    services: { datasetQuality, notifications },
  } = useKibanaContextForPlugin();

  useBreadcrumbs();

  return (
    <DatasetQualityContextProvider
      datasetQuality={datasetQuality}
      urlStateStorageContainer={urlStateStorageContainer}
      toastsService={notifications.toasts}
    >
      <ConnectedContent />
    </DatasetQualityContextProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const { controller } = useDatasetQualityContext();

  return controller ? (
    <InitializedContent datasetQualityController={controller} />
  ) : (
    <>
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={
          <FormattedMessage
            id="xpack.dataQuality.Initializing"
            defaultMessage="Initializing Data Set Quality page"
          />
        }
      />
    </>
  );
});

const InitializedContent = React.memo(
  ({ datasetQualityController }: { datasetQualityController: DatasetQualityController }) => {
    const {
      services: { datasetQuality },
    } = useKibanaContextForPlugin();

    return <datasetQuality.DatasetQuality controller={datasetQualityController} />;
  }
);
