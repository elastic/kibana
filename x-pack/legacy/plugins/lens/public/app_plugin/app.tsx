/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Storage } from 'ui/storage';
import { toastNotifications } from 'ui/notify';
import { Chrome } from 'ui/chrome';
import {
  Query,
  QueryBar as QueryBarType,
} from '../../../../../../src/legacy/core_plugins/data/public/query';
import { Document, SavedObjectStore } from '../persistence';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

interface State {
  isLoading: boolean;
  isDirty: boolean;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  indexPatternTitles: string[];
  persistedDoc?: Document;
}

export function App({
  editorFrame,
  store,
  chrome,
  docId,
  docStorage,
  QueryBar,
  redirectTo,
}: {
  editorFrame: EditorFrameInstance;
  chrome: Chrome;
  store: Storage;
  docId?: string;
  docStorage: SavedObjectStore;
  QueryBar: typeof QueryBarType;
  redirectTo: (id?: string) => void;
}) {
  const uiSettings = chrome.getUiSettingsClient();
  const timeDefaults = uiSettings.get('timepicker:timeDefaults');
  const language = store.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>({
    isLoading: !!docId,
    isDirty: false,
    query: { query: '', language },
    dateRange: {
      fromDate: timeDefaults.from,
      toDate: timeDefaults.to,
    },
    indexPatternTitles: [],
  });

  const lastKnownDocRef = useRef<Document | undefined>(undefined);

  useEffect(() => {
    if (docId && (!state.persistedDoc || state.persistedDoc.id !== docId)) {
      setState({ ...state, isLoading: true });
      docStorage
        .load(docId)
        .then(doc => {
          setState({
            ...state,
            isLoading: false,
            persistedDoc: doc,
            query: doc.state.query,
            indexPatternTitles: doc.state.datasourceMetaData.filterableIndexPatterns.map(
              ({ title }) => title
            ),
          });
        })
        .catch(() => {
          setState({ ...state, isLoading: false });

          toastNotifications.addDanger(
            i18n.translate('xpack.lens.editorFrame.docLoadingError', {
              defaultMessage: 'Error loading saved document',
            })
          );

          redirectTo();
        });
    }
  }, [docId]);

  // Can save if the frame has told us what it has, and there is either:
  // a) No saved doc
  // b) A saved doc that differs from the frame state
  const isSaveable = state.isDirty;

  const onError = useCallback(
    (e: { message: string }) =>
      toastNotifications.addDanger({
        title: e.message,
      }),
    []
  );

  return (
    <I18nProvider>
      <div className="lnsApp">
        <div className="lnsAppHeader">
          <nav>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="lnsApp_saveButton"
                  onClick={() => {
                    if (isSaveable && lastKnownDocRef.current) {
                      docStorage
                        .save(lastKnownDocRef.current)
                        .then(({ id }) => {
                          // Prevents unnecessary network request and disables save button
                          const newDoc = { ...lastKnownDocRef.current!, id };
                          setState({
                            ...state,
                            isDirty: false,
                            persistedDoc: newDoc,
                          });
                          if (docId !== id) {
                            redirectTo(id);
                          }
                        })
                        .catch(reason => {
                          toastNotifications.addDanger(
                            i18n.translate('xpack.lens.editorFrame.docSavingError', {
                              defaultMessage: 'Error saving document {reason}',
                              values: { reason },
                            })
                          );
                        });
                    }
                  }}
                  color={isSaveable ? 'primary' : 'subdued'}
                  disabled={!isSaveable}
                >
                  {i18n.translate('xpack.lens.editorFrame.save', {
                    defaultMessage: 'Save',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </nav>
          <QueryBar
            data-test-subj="lnsApp_queryBar"
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
            indexPatterns={state.indexPatternTitles}
            store={store}
            showDatePicker={true}
            showQueryInput={true}
            query={state.query}
            dateRangeFrom={state.dateRange && state.dateRange.fromDate}
            dateRangeTo={state.dateRange && state.dateRange.toDate}
          />
        </div>

        {(!state.isLoading || state.persistedDoc) && (
          <NativeRenderer
            className="lnsAppFrame"
            render={editorFrame.mount}
            nativeProps={{
              dateRange: state.dateRange,
              query: state.query,
              doc: state.persistedDoc,
              onError,
              onChange: ({ indexPatternTitles, doc }) => {
                const indexPatternChange = !_.isEqual(state.indexPatternTitles, indexPatternTitles);
                const docChange = !_.isEqual(state.persistedDoc, doc);
                if (indexPatternChange || docChange) {
                  setState({
                    ...state,
                    indexPatternTitles,
                    isDirty: docChange,
                  });
                }
                lastKnownDocRef.current = doc;
              },
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}
