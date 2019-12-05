/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useCallback } from 'react';
import { CoreStart } from 'src/core/public';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { NotificationsStart } from 'src/core/public';
import {
  DataStart,
  IndexPattern as IndexPatternInstance,
  IndexPatterns as IndexPatternsService,
} from 'src/legacy/core_plugins/data/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { ExpressionRenderer } from 'src/plugins/expressions/public';
import { start as navigation } from '../../../../../../src/legacy/core_plugins/navigation/public/legacy';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { SavedObjectStore } from '../persistence';
import { Visualization, Datasource } from '../types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { EditorFrame } from '../editor_frame';
import { StateManager } from '../state_manager';
import { State } from './app_state_manager';

export interface Props {
  stateManager: StateManager<State>;
  state: State;
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  data: DataPublicPluginStart;
  core: CoreStart;
  dataShim: DataStart;
  storage: IStorageWrapper;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string) => void;
  ExpressionRenderer: ExpressionRenderer;
}

export function App({
  stateManager,
  state,
  datasourceMap,
  visualizationMap,
  data,
  dataShim,
  core,
  storage,
  docStorage,
  redirectTo,
  ExpressionRenderer: expressionRenderer,
}: Props) {
  const { setState } = stateManager;
  const { lastKnownDoc } = state;
  const isSaveable = lastKnownDoc && core.application.capabilities.visualize.save;

  const onError = useCallback(
    (e: { message: string }) =>
      core.notifications.toasts.addDanger({
        title: e.message,
      }),
    []
  );

  const { TopNavMenu } = navigation.ui;

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
            <div className="lnsApp__frame">
              <EditorFrame
                data-test-subj="lnsEditorFrame"
                dateRange={state.dateRange}
                query={state.query}
                filters={state.filters}
                savedQuery={state.savedQuery}
                doc={state.persistedDoc}
                datasourceMap={datasourceMap}
                visualizationMap={visualizationMap}
                core={core}
                ExpressionRenderer={expressionRenderer}
                onError={onError}
                onChange={({ filterableIndexPatterns, doc }) => {
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
                      dataShim.indexPatterns.indexPatterns,
                      core.notifications
                    ).then(indexPatterns => {
                      if (indexPatterns) {
                        setState(s => ({ ...s, indexPatternsForTopNav: indexPatterns }));
                      }
                    });
                  }
                }}
              />
            </div>
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

                  if (doc.id !== id) {
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
  indexPatternsService: IndexPatternsService,
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
