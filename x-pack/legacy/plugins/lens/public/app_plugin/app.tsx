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
import { CoreStart, NotificationsStart } from 'src/core/public';
import {
  DataSetup,
  IndexPattern as IndexPatternInstance,
  IndexPatterns as IndexPatternsService,
  SavedQuery,
  Query,
} from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { TopNavMenu } from '../../../../../../src/legacy/core_plugins/kibana_react/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { Document, SavedObjectStore } from '../persistence';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

interface State {
  isLoading: boolean;
  isDirty: boolean;
  indexPatternsForTopNav: IndexPatternInstance[];
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
}: {
  editorFrame: EditorFrameInstance;
  core: CoreStart;
  data: DataSetup;
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
    indexPatternsForTopNav: [],

    query: { query: '', language },
    dateRange: {
      fromDate: timeDefaults.from,
      toDate: timeDefaults.to,
    },
    filters: [],
  });

  const lastKnownDocRef = useRef<Document | undefined>(undefined);

  useEffect(() => {
    const subscription = data.filter.filterManager.getUpdates$().subscribe({
      next: () => {
        setState(s => ({ ...s, filters: data.filter.filterManager.getFilters() }));
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      setState(s => ({ ...s, isLoading: true }));
      docStorage
        .load(docId)
        .then(doc => {
          getAllIndexPatterns(
            doc.state.datasourceMetaData.filterableIndexPatterns,
            data.indexPatterns.indexPatterns,
            core.notifications
          )
            .then(indexPatterns => {
              setState(s => ({
                ...s,
                isLoading: false,
                persistedDoc: doc,
                query: doc.state.query,
                filters: doc.state.filters,
                dateRange: doc.state.dateRange || s.dateRange,
                indexPatternsForTopNav: indexPatterns,
              }));
            })
            .catch(() => {
              setState(s => ({ ...s, isLoading: false }));

              redirectTo();
            });
        })
        .catch(() => {
          setState(s => ({ ...s, isLoading: false }));

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
  const isSaveable = state.isDirty && (core.application.capabilities.lens.save as boolean);

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
                          setState(s => ({
                            ...s,
                            isDirty: false,
                            persistedDoc: newDoc,
                          }));
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
                setState(s => ({
                  ...s,
                  dateRange: {
                    fromDate: dateRange.from,
                    toDate: dateRange.to,
                  },
                  query: query || s.query,
                }));
              }}
              filters={state.filters}
              onFiltersUpdated={filters => {
                data.filter.filterManager.setFilters(filters);
              }}
              appName={'lens'}
              indexPatterns={state.indexPatternsForTopNav}
              store={store}
              showSearchBar={true}
              showDatePicker={true}
              showQueryInput={true}
              showFilterBar={true}
              showSaveQuery={core.application.capabilities.lens.saveQuery as boolean}
              savedQuery={state.savedQuery}
              onSaved={savedQuery => {
                setState(s => ({ ...s, savedQuery }));
              }}
              onSavedQueryUpdated={savedQuery => {
                data.filter.filterManager.setFilters(
                  savedQuery.attributes.filters || state.filters
                );
                setState(s => ({
                  ...s,
                  savedQuery: { ...savedQuery }, // Shallow query for reference issues
                  dateRange: savedQuery.attributes.timefilter
                    ? {
                        fromDate: savedQuery.attributes.timefilter.from,
                        toDate: savedQuery.attributes.timefilter.to,
                      }
                    : s.dateRange,
                }));
              }}
              onClearSavedQuery={() => {
                data.filter.filterManager.removeAll();
                setState(s => ({
                  ...s,
                  savedQuery: undefined,
                  filters: [],
                  query: {
                    query: '',
                    language:
                      store.get('kibana.userQueryLanguage') ||
                      core.uiSettings.get('search:queryLanguage'),
                  },
                }));
              }}
              query={state.query}
              dateRangeFrom={state.dateRange.fromDate}
              dateRangeTo={state.dateRange.toDate}
              timeHistory={data.timefilter.history}
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
                    setState(s => ({ ...s, isDirty: true }));
                  }

                  // Update the cached index patterns if the user made a change to any of them
                  if (
                    state.indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
                    filterableIndexPatterns.filter(
                      ({ id }) =>
                        !state.indexPatternsForTopNav.find(indexPattern => indexPattern.id === id)
                    ).length !== state.indexPatternsForTopNav.length
                  ) {
                    getAllIndexPatterns(
                      filterableIndexPatterns,
                      data.indexPatterns.indexPatterns,
                      core.notifications
                    ).then(indexPatterns => {
                      if (indexPatterns) {
                        setState(s => ({ ...s, indexPatternsForTopNav: indexPatterns }));
                      }
                    });
                  }
                },
              }}
            />
          )}
        </div>
      </KibanaContextProvider>
    </I18nProvider>
  );
}

export async function getAllIndexPatterns(
  ids: Array<{ id: string }>,
  indexPatternsService: IndexPatternsService,
  notifications: NotificationsStart
): Promise<IndexPatternInstance[]> {
  try {
    return await Promise.all(ids.map(({ id }) => indexPatternsService.get(id)));
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.editorFrame.indexPatternLoadingError', {
        defaultMessage: 'Error loading index patterns',
      })
    );

    throw new Error(e);
  }
}
