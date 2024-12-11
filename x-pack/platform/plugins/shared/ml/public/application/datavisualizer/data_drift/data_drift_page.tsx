/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataDriftSpec } from '@kbn/data-visualizer-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { useDataSource } from '../../contexts/ml';
import { MlPageHeader } from '../../components/page_header';
import { TechnicalPreviewBadge } from '../../components/technical_preview_badge';

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

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.dataDruiftWithDocCount.pageHeader"
              defaultMessage="Data drift"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {dataView && DataDriftView ? (
        <DataDriftView dataView={dataView} savedSearch={savedSearch} />
      ) : null}
    </>
  );
};
