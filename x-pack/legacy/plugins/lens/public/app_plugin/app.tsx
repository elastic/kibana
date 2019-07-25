/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { Storage } from 'ui/storage';
import { toastNotifications } from 'ui/notify';
import { QuerySetup, Query } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

interface State {
  dateRange?: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
}

export function App({
  editorFrame,
  store,
  QueryBar,
}: {
  editorFrame: EditorFrameInstance;
  store: Storage;
  QueryBar: QuerySetup['ui']['QueryBar'];
}) {
  const [state, setState] = useState({
    query: { query: '', language: 'kuery' },
  } as State);

  return (
    <I18nProvider>
      <div className="lnsApp">
        {/* <QueryBar onSubmit={({ dateRange, query }) => {
        console.log(dateRange, query);
      }) /> */}
        <div className="lnsAppHeader">
          <QueryBar
            query={{ query: '', language: 'kuery' }}
            screenTitle={'lens'}
            onSubmit={({ dateRange, query }) => {
              setState({
                dateRange: {
                  fromDate: dateRange.from,
                  toDate: dateRange.to,
                },
                query: query || state.query,
              });
            }}
            appName={'lens'}
            indexPatterns={[]}
            store={store}
            // prepend={props.showFilterBar ? this.getFilterTriggerButton() : undefined}
            showDatePicker={true}
            showQueryInput={true}
            dateRangeFrom={state.dateRange && state.dateRange.fromDate}
            dateRangeTo={state.dateRange && state.dateRange.toDate}
            // isRefreshPaused={props.isRefreshPaused}
            // refreshInterval={props.refreshInterval}
            // showAutoRefreshOnly={props.showAutoRefreshOnly}
            // onRefreshChange={props.onRefreshChange}
          />
        </div>

        <NativeRenderer
          className="lnsAppFrame"
          render={editorFrame.mount}
          nativeProps={{
            onError: (e: { message: string }) =>
              toastNotifications.addDanger({
                title: e.message,
              }),
          }}
        />
      </div>
    </I18nProvider>
  );
}
