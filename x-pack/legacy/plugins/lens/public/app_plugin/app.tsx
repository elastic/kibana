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
import { CoreStart } from 'src/core/public';
import { Query } from '../../../../../../src/legacy/core_plugins/data/public';
import { QueryBarTopRow } from '../../../../../../src/legacy/core_plugins/data/public/query/query_bar';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
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
  localQueryBarState: {
    query?: Query;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

function isLocalStateDirty(
  localState: State['localQueryBarState'],
  query: Query,
  dateRange: State['dateRange']
) {
  return Boolean(
    (localState.query && query && localState.query.query !== query.query) ||
      (localState.dateRange && dateRange.fromDate !== localState.dateRange.from) ||
      (localState.dateRange && dateRange.toDate !== localState.dateRange.to)
  );
}

export function App({
  editorFrame,
  core,
  store,
  docId,
  docStorage,
  redirectTo,
}: {
  editorFrame: EditorFrameInstance;
  core: CoreStart;
  store: Storage;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string) => void;
}) {
  const timeDefaults = core.uiSettings.get('timepicker:timeDefaults');
  const language =
    store.get('kibana.userQueryLanguage') || core.uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>({
    isLoading: !!docId,
    isDirty: false,
    query: { query: '', language },
    dateRange: {
      fromDate: timeDefaults.from,
      toDate: timeDefaults.to,
    },
    indexPatternTitles: [],
    localQueryBarState: {
      query: { query: '', language },
      dateRange: {
        from: timeDefaults.from,
        to: timeDefaults.to,
      },
    },
  });

  const lastKnownDocRef = useRef<Document | undefined>(undefined);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        href: core.http.basePath.prepend(`/app/kibana#/visualize`),
        text: i18n.translate('xpack.lens.breadcrumbsTitle', {
          defaultMessage: 'Visualize',
        }),
      },
      {
        text: state.persistedDoc
          ? state.persistedDoc.title
          : i18n.translate('xpack.lens.breadcrumbsCreate', { defaultMessage: 'Create' }),
      },
    ]);
  }, [state.persistedDoc && state.persistedDoc.title]);

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
            localQueryBarState: {
              ...state.localQueryBarState,
              query: doc.state.query,
            },
            indexPatternTitles: doc.state.datasourceMetaData.filterableIndexPatterns.map(
              ({ title }) => title
            ),
          });
        })
        .catch(() => {
          setState({ ...state, isLoading: false });

          core.notifications.toasts.addDanger(
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
      core.notifications.toasts.addDanger({
        title: e.message,
      }),
    []
  );

  return (
    <I18nProvider>
      <KibanaContextProvider
        services={{
          uiSettings: core.uiSettings,
          savedObjects: core.savedObjects,
          notifications: core.notifications,
          http: core.http,
        }}
      >
        <div className="lnsApp">
          <div className="lnsApp__header">
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
                            core.notifications.toasts.addDanger(
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
            <QueryBarTopRow
              data-test-subj="lnsApp_queryBar"
              screenTitle={'lens'}
              onSubmit={payload => {
                const { dateRange, query } = payload;
                setState({
                  ...state,
                  dateRange: {
                    fromDate: dateRange.from,
                    toDate: dateRange.to,
                  },
                  query: query || state.query,
                  localQueryBarState: payload,
                });
              }}
              onChange={localQueryBarState => {
                setState({ ...state, localQueryBarState });
              }}
              isDirty={isLocalStateDirty(state.localQueryBarState, state.query, state.dateRange)}
              appName={'lens'}
              indexPatterns={state.indexPatternTitles}
              store={store}
              showDatePicker={true}
              showQueryInput={true}
              query={state.localQueryBarState.query}
              dateRangeFrom={
                state.localQueryBarState.dateRange && state.localQueryBarState.dateRange.from
              }
              dateRangeTo={
                state.localQueryBarState.dateRange && state.localQueryBarState.dateRange.to
              }
            />
          </div>

          {(!state.isLoading || state.persistedDoc) && (
            <NativeRenderer
              className="lnsApp__frame"
              render={editorFrame.mount}
              nativeProps={{
                dateRange: state.dateRange,
                query: state.query,
                doc: state.persistedDoc,
                onError,
                onChange: ({ indexPatternTitles, doc }) => {
                  const indexPatternChange = !_.isEqual(
                    state.indexPatternTitles,
                    indexPatternTitles
                  );
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
      </KibanaContextProvider>
    </I18nProvider>
  );
}
