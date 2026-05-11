/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataDriftSpec } from '@kbn/data-visualizer-plugin/public';

import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { useDataSource } from '../../contexts/ml';
import { MlPageHeader } from '../../components/page_header';
import { PageTitle } from '../../components/page_title';
import { DataSourcePicker } from '../../components/data_source_picker/data_source_picker';
import { createPath } from '../../routing/router';

export const DataDriftPage: FC = () => {
  const {
    services: { dataVisualizer },
  } = useMlKibana();

  const [DataDriftView, setDataDriftView] = useState<DataDriftSpec | null>(null);

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getDataDriftComponent } = dataVisualizer;
      getDataDriftComponent().then(setDataDriftView);
    }
  }, [dataVisualizer]);

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();
  const navigateToPath = useNavigateToPath();

  const dataSourcePicker = (
    <DataSourcePicker
      currentDataView={dataView ?? null}
      currentSavedSearch={savedSearch ?? null}
      onCreateDataView={() => navigateToPath(createPath(ML_PAGES.DATA_DRIFT_CUSTOM))}
      createDataViewButtonTestSubj="dataDriftCreateDataViewButton"
    />
  );

  return (
    <>
      <MlPageHeader>
        <PageTitle
          title={
            <FormattedMessage id="xpack.ml.dataDrift.pageHeader" defaultMessage="Data drift" />
          }
        />
      </MlPageHeader>
      {dataView && DataDriftView ? (
        <DataDriftView
          key={savedSearch?.id ?? dataView.id ?? dataView.getIndexPattern()}
          dataView={dataView}
          savedSearch={savedSearch}
          headerContent={dataSourcePicker}
        />
      ) : (
        <>
          {dataSourcePicker}
          <EuiEmptyPrompt
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.dataDrift.noDataViewTitle"
                  defaultMessage="No data view selected"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.dataDrift.noDataViewBody"
                  defaultMessage="Select a data view or Discover session to get started."
                />
              </p>
            }
          />
        </>
      )}
    </>
  );
};
