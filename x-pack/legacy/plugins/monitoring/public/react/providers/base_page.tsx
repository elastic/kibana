/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

/* TODO:
import { getPageData } from '../lib/get_page_data';
import { updateSetupModeData, getSetupModeState } from '../../lib/setup_mode';
import { PageLoading } from '../../components';
*/


//import { PromiseWithCancel } from '../../../common/cancel_promise';

import { PageLoading } from '../components';
import { Header } from './header';

type Props = {
  getData?: Promise<any>
  title?: string
  disableTimeRangeSelector?: boolean
  disableAutoRefreshSelector?: boolean
  children?: any
  defaultData?: Object | any
}

const DataContext = React.createContext({});

export const useDataContext = () => {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext() can only be used within <DataProvider> ... </DataProvider>');
  }
  return context;
};

export const DataProvider = (props: Props) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState(props.defaultData);

  React.useEffect(() => {
    console.log('DataProvider > useEffect()');

    setData((state: any) => {

      const count = state.count + 1;
      const newState = { ...state, count };
      return newState;

    });

    setIsLoading(false);

  }, [setData, setIsLoading, props]);

  const onRefresh = (str: string) => {
    console.log('onRefresh:', str);

    setData((state: any) => {

      const count = state.count + 1;
      const newState = { ...state, count };
      return newState;

    });
  }

  return (
    <>
      <Header {...{ onRefresh, title: props.title }} />
      <DataContext.Provider value={[data, setData]}>
        {(isLoading) ? <PageLoading /> : props.children}
      </DataContext.Provider>
    </>
  );
};
