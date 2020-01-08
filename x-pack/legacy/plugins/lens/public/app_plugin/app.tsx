/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Query, DataPublicPluginStart } from 'src/plugins/data/public';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { AppMountContext, NotificationsStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { npStart } from 'ui/new_platform';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { Document, SavedObjectStore } from '../persistence';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  esFilters,
  IndexPattern as IndexPatternInstance,
  IndexPatternsContract,
  SavedQuery,
} from '../../../../../../src/plugins/data/public';

interface State {
  isLoading: boolean;
  isSaveModalVisible: boolean;
  indexPatternsForTopNav: IndexPatternInstance[];
  persistedDoc?: Document;
  lastKnownDoc?: Document;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: esFilters.Filter[];
  savedQuery?: SavedQuery;
}

export function App({
  editorFrame,
  data,
  core,
  storage,
  docId,
  docStorage,
  redirectTo,
}: {
  editorFrame: EditorFrameInstance;
  data: DataPublicPluginStart;
  core: AppMountContext['core'];
  storage: IStorageWrapper;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string) => void;
}) {
  const language =
    storage.get('kibana.userQueryLanguage') || core.uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>(() => {
    const currentRange = data.query.timefilter.timefilter.getTime();
    return {
      isLoading: !!docId,
      isSaveModalVisible: false,
      indexPatternsForTopNav: [],
      query: { query: '', language },
      dateRange: {
        fromDate: currentRange.from,
        toDate: currentRange.to,
      },
      filters: [],
    };
  });

  const { lastKnownDoc } = state;

  useEffect(() => {
    const filterSubscription = data.query.filterManager.getUpdates$().subscribe({
      next: () => {
        setState(s => ({ ...s, filters: data.query.filterManager.getFilters() }));
        trackUiEvent('app_filters_updated');
      },
    });
    return () => {
      filterSubscription.unsubscribe();
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
            data.indexPatterns,
            core.notifications
          )
            .then(indexPatterns => {
              setState(s => ({
                ...s,
                isLoading: false,
                persistedDoc: doc,
                lastKnownDoc: doc,
                query: doc.state.query,
                filters: doc.state.filters,
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
            i18n.translate('xpack.lens.app.docLoadingError', {
              defaultMessage: 'Error loading saved document',
            })
          );

          redirectTo();
        });
    }
  }, [docId]);

  const isSaveable =
    lastKnownDoc &&
    lastKnownDoc.expression &&
    lastKnownDoc.expression.length > 0 &&
    core.application.capabilities.visualize.save;

  const onError = useCallback(
    (e: { message: string }) =>
      core.notifications.toasts.addDanger({
        title: e.message,
      }),
    []
  );

  const { TopNavMenu } = npStart.plugins.navigation.ui;

  return (
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'lens',
          data,
          storage,
          ...core,
        }}
      >
        <div className="lnsApp">
          <div className="lnsApp__header">
            <TopNavMenu
              config={[
                {
                  label: i18n.translate('xpack.lens.app.save', {
                    defaultMessage: 'Save',
                  }),
                  run: () => {
                    if (isSaveable && lastKnownDoc) {
                      setState(s => ({ ...s, isSaveModalVisible: true }));
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

                if (
                  dateRange.from !== state.dateRange.fromDate ||
                  dateRange.to !== state.dateRange.toDate
                ) {
                  data.query.timefilter.timefilter.setTime(dateRange);
                  trackUiEvent('app_date_change');
                } else {
                  trackUiEvent('app_query_change');
                }

                setState(s => ({
                  ...s,
                  dateRange: {
                    fromDate: dateRange.from,
                    toDate: dateRange.to,
                  },
                  query: query || s.query,
                }));
              }}
              appName={'lens'}
              indexPatterns={state.indexPatternsForTopNav}
              showSearchBar={true}
              showDatePicker={true}
              showQueryBar={true}
              showFilterBar={true}
              showSaveQuery={core.application.capabilities.visualize.saveQuery as boolean}
              savedQuery={state.savedQuery}
              onSaved={savedQuery => {
                setState(s => ({ ...s, savedQuery }));
              }}
              onSavedQueryUpdated={savedQuery => {
                data.query.filterManager.setFilters(savedQuery.attributes.filters || state.filters);
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
                data.query.filterManager.removeAll();
                setState(s => ({
                  ...s,
                  savedQuery: undefined,
                  filters: [],
                  query: {
                    query: '',
                    language:
                      storage.get('kibana.userQueryLanguage') ||
                      core.uiSettings.get('search:queryLanguage'),
                  },
                }));
              }}
              query={state.query}
              dateRangeFrom={state.dateRange.fromDate}
              dateRangeTo={state.dateRange.toDate}
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
                  if (!_.isEqual(state.persistedDoc, doc)) {
                    setState(s => ({ ...s, lastKnownDoc: doc }));
                  }

                  // Update the cached index patterns if the user made a change to any of them
                  if (
                    state.indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
                    filterableIndexPatterns.find(
                      ({ id }) =>
                        !state.indexPatternsForTopNav.find(indexPattern => indexPattern.id === id)
                    )
                  ) {
                    getAllIndexPatterns(
                      filterableIndexPatterns,
                      data.indexPatterns,
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
        {lastKnownDoc && state.isSaveModalVisible && (
          <SavedObjectSaveModal
            onSave={props => {
              const doc = {
                ...lastKnownDoc,
                id: props.newCopyOnSave ? undefined : lastKnownDoc.id,
                title: props.newTitle,
              };

              docStorage
                .save(doc)
                .then(({ id }) => {
                  // Prevents unnecessary network request and disables save button
                  const newDoc = { ...doc, id };
                  setState(s => ({
                    ...s,
                    isSaveModalVisible: false,
                    persistedDoc: newDoc,
                    lastKnownDoc: newDoc,
                  }));

                  if (docId !== id) {
                    redirectTo(id);
                  }
                })
                .catch(() => {
                  trackUiEvent('save_failed');
                  core.notifications.toasts.addDanger(
                    i18n.translate('xpack.lens.app.docSavingError', {
                      defaultMessage: 'Error saving document',
                    })
                  );
                  setState(s => ({ ...s, isSaveModalVisible: false }));
                });
            }}
            onClose={() => setState(s => ({ ...s, isSaveModalVisible: false }))}
            title={lastKnownDoc.title || ''}
            showCopyOnSave={true}
            objectType={i18n.translate('xpack.lens.app.saveModalType', {
              defaultMessage: 'Lens visualization',
            })}
          />
        )}
      </KibanaContextProvider>
    </I18nProvider>
  );
}

export async function getAllIndexPatterns(
  ids: Array<{ id: string }>,
  indexPatternsService: IndexPatternsContract,
  notifications: NotificationsStart
): Promise<IndexPatternInstance[]> {
  try {
    return await Promise.all(ids.map(({ id }) => indexPatternsService.get(id)));
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.indexPatternLoadingError', {
        defaultMessage: 'Error loading index patterns',
      })
    );

    throw new Error(e);
  }
}
