/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { Storage } from 'ui/storage';
import { toastNotifications } from 'ui/notify';
import { Document, SavedObjectStore } from '../persistence';
import { QuerySetup, Query } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

interface State {
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  indexPatterns: string[];
  lastKnownDoc?: Document;
  persistedDoc?: Document;
}

export function App({
  editorFrame,
  store,
  docId,
  docStorage,
  QueryBar,
  redirectTo,
}: {
  editorFrame: EditorFrameInstance;
  store: Storage;
  docId?: string;
  docStorage: SavedObjectStore;
  QueryBar: QuerySetup['ui']['QueryBar'];
  redirectTo: (id: string) => void;
}) {
  const [state, setState] = useState({
    query: { query: '', language: 'kuery' },
    dateRange: {
      fromDate: 'now-15m',
      toDate: 'now',
    },
    indexPatterns: [],
  } as State);

  useEffect(() => {
    if (docId) {
      docStorage
        .load(docId)
        .then(doc => {
          setState({
            ...state,
            persistedDoc: doc,
          });
        })
        .catch((error: Error) => {
          // TODO: Do error stuff
          return { error };
        });
    }
  }, [docId]);

  return (
    <I18nProvider>
      <div className="lnsApp">
        <div className="lnsAppHeader">
          <QueryBar
            screenTitle={'lens'}
            onSubmit={({ dateRange, query }) => {
              setState({
                ...state,
                dateRange: {
                  fromDate: dateRange.from,
                  toDate: dateRange.to,
                },
                query: query || state.query,
              });
            }}
            appName={'lens'}
            indexPatterns={state.indexPatterns}
            store={store}
            showDatePicker={true}
            showQueryInput={true}
            query={state.query}
            dateRangeFrom={state.dateRange && state.dateRange.fromDate}
            dateRangeTo={state.dateRange && state.dateRange.toDate}
          />

          <nav>
            <EuiLink
              onClick={() => {
                if (state.lastKnownDoc) {
                  docStorage.save(state.lastKnownDoc).then(({ id }) => {
                    redirectTo(id);
                  });
                }
              }}
              // disabled={state.saving || !state.activeDatasourceId || !state.visualization.activeId}
            >
              {i18n.translate('xpack.lens.editorFrame.Save', {
                defaultMessage: 'Save',
              })}
            </EuiLink>
          </nav>
        </div>

        <NativeRenderer
          className="lnsAppFrame"
          render={editorFrame.mount}
          nativeProps={{
            dateRange: state.dateRange,
            query: state.query,
            doc: state.persistedDoc,
            onIndexPatternChange: (newIndexPatterns: string[]) => {
              setState({
                ...state,
                indexPatterns: newIndexPatterns,
              });
            },
            onStateChange: (newDoc: Document) => {
              setState({
                ...state,
                lastKnownDoc: newDoc,
              });
            },
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
