/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DataProvider, useDataContext } from '../../providers/base_page';
// @ts-ignore
import { NoData } from '../../../components/no_data';

const NoDataPage = () => {
  const [value, setValue] = useDataContext();

  const props = {
    errors: [],
    checkMessage: null,
    isLoading: true,
    isCollectionEnabledUpdating: false,
    isCollectionEnabledUpdated: false,
    isCollectionIntervalUpdating: false,
    isCollectionIntervalUpdated: false
  };

  const changePath = (_?: string) => void 0;
  const enableCollectionInterval = () => {
    console.log('enableCollectionInterval');
  }
  const enabler = { enableCollectionInterval };

  return (<NoData {...props} enabler={enabler} changePath={changePath} />)
}

const title = i18n.translate('xpack.monitoring.noData.routeTitle', {
  defaultMessage: 'Setup Monitoring'
});

export const NoDataView = () => {

  const props = { title, defaultData: { count: 0 } };
  return (
    <DataProvider {...props}>
      <NoDataPage />
    </DataProvider>
  );
}
