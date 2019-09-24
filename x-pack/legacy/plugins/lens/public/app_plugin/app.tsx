/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Storage } from 'ui/storage';
import { CoreStart, SavedObjectsClientContract } from 'src/core/public';
import {
  DataSetup,
  IndexPattern as IndexPatternInstance,
  SavedQuery,
} from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { TopNavMenu } from '../../../../../../src/legacy/core_plugins/kibana_react/public';
import { Query } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { Document, SavedObjectStore } from '../persistence';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

interface State {
  isLoading: boolean;
  isDirty: boolean;
  // indexPatternTitles: string[];
  indexPatterns: IndexPatternInstance[];
  persistedDoc?: Document;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
}

export function App({
  editorFrame,
  core,
  data,
  store,
  docId,
  docStorage,
  redirectTo,
  savedObjectsClient,
}: {
  editorFrame: EditorFrameInstance;
  core: CoreStart;
  data: DataSetup;
  store: Storage;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string) => void;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const timeDefaults = core.uiSettings.get('timepicker:timeDefaults');
  const language =
    store.get('kibana.userQueryLanguage') || core.uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>({
    isLoading: !!docId,
    isDirty: false,
    // indexPatternTitles: [],
    indexPatterns: [],

    query: { query: '', language },
    dateRange: {
      fromDate: timeDefaults.from,
      toDate: timeDefaults.to,
    },
    filters: [],
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
          Promise.all(
            doc.state.datasourceMetaData.filterableIndexPatterns.map(({ id }) =>
              data.indexPatterns.indexPatterns.get(id)
            )
          )
            .then(indexPatterns => {
              setState({
                ...state,
                isLoading: false,
                persistedDoc: doc,
                query: doc.state.query,
                filters: doc.state.filters,
                dateRange: doc.state.dateRange || state.dateRange,
                indexPatterns,
              });
            })
            .catch(() => {
              setState({ ...state, isLoading: false });

              core.notifications.toasts.addDanger(
                i18n.translate('xpack.lens.editorFrame.indexPatternLoadingError', {
                  defaultMessage: 'Error loading index patterns',
                })
              );

              redirectTo();
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
      <div className="lnsApp">
        <div className="lnsApp__header">
          <TopNavMenu
            name="lens"
            config={[
              {
                label: i18n.translate('xpack.lens.editorFrame.save', {
                  defaultMessage: 'Save',
                }),
                run: () => {
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
                },
                testId: 'lnsApp_saveButton',
                disableButton: !isSaveable,
              },
            ]}
            data-test-subj="lnsApp_topNav"
            screenTitle={'lens'}
            onQuerySubmit={payload => {
              const { dateRange, query } = payload;
              setState({
                ...state,
                dateRange: {
                  fromDate: dateRange.from,
                  toDate: dateRange.to,
                },
                query: query || state.query,
              });
            }}
            filters={state.filters}
            onFiltersUpdated={filters => {
              setState({ ...state, filters });
            }}
            appName={'lens'}
            indexPatterns={state.indexPatterns}
            store={store}
            showSearchBar={true}
            showDatePicker={true}
            showQueryInput={true}
            showFilterBar={true}
            showSaveQuery={true /* TODO: Use permissions */}
            savedQuery={state.savedQuery}
            onSaved={savedQuery => {
              setState({ ...state, savedQuery });
            }}
            onSavedQueryUpdated={savedQuery => {
              setState({
                ...state,
                savedQuery,
                filters: savedQuery.attributes.filters || state.filters,
                query: savedQuery.attributes.query,
              });
            }}
            onClearSavedQuery={() => {
              setState({
                ...state,
                savedQuery: undefined,
                filters: [],
                query: {
                  query: '',
                  language:
                    store.get('kibana.userQueryLanguage') ||
                    core.uiSettings.get('search:queryLanguage'),
                },
              });
            }}
            query={state.query}
            dateRangeFrom={state.dateRange.fromDate}
            dateRangeTo={state.dateRange.toDate}
            toasts={core.notifications.toasts}
            uiSettings={core.uiSettings}
            savedObjectsClient={savedObjectsClient}
            http={core.http}
          />
        </div>

        {(!state.isLoading || state.persistedDoc) && (
          <NativeRenderer
            className="lnsApp__frame"
            render={editorFrame.mount}
            nativeProps={{
              dateRange: state.dateRange,
              query: state.query,
              filters: state.filters,
              savedQuery: state.savedQuery,
              doc: state.persistedDoc,
              onError,
              onChange: ({ filterableIndexPatterns, doc }) => {
                lastKnownDocRef.current = doc;

                if (!_.isEqual(state.persistedDoc, doc)) {
                  setState({ ...state, isDirty: true });
                }

                Promise.all(
                  filterableIndexPatterns.map(({ id }) => data.indexPatterns.indexPatterns.get(id))
                )
                  .then(indexPatterns => {
                    setState({
                      ...state,
                      indexPatterns,
                    });
                  })
                  .catch(() => {
                    core.notifications.toasts.addDanger(
                      i18n.translate('xpack.lens.editorFrame.indexPatternLoadingError', {
                        defaultMessage: 'Error loading index patterns',
                      })
                    );
                  });
              },
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}
