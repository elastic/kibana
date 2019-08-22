/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Storage } from 'ui/storage';
import { toastNotifications } from 'ui/notify';
import { Chrome } from 'ui/chrome';
import { QueryBar } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { SavedObjectStore } from '../persistence';
import { Datasource, Visualization } from '../types';
import { ExpressionRenderer } from '../../../../../../src/legacy/core_plugins/data/public';
import { EditorFrame } from '../editor_frame_plugin/editor_frame';
import { initialState, initialize, getFramePublicAPI, toSavedObject } from '../state_management';

export function App({
  datasourceMap,
  visualizationMap,
  expressionRenderer,
  store,
  chrome,
  docId,
  docStorage,
  redirectTo,
}: {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  expressionRenderer: ExpressionRenderer;
  chrome: Chrome;
  store: Storage;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string) => void;
}) {
  const uiSettings = chrome.getUiSettingsClient();
  const timeDefaults = uiSettings.get('timepicker:timeDefaults');

  const [state, setState] = useState(
    initialState({
      datasourceMap,
      visualizationMap,
      dateRange: {
        fromDate: timeDefaults.from,
        toDate: timeDefaults.to,
      },
      language: store.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
    })
  );

  const framePublicAPI = getFramePublicAPI({
    datasourceMap,
    state,
    setState,
  });

  const saveableDoc = toSavedObject({
    datasourceMap,
    visualizationMap,
    state,
    framePublicAPI,
  });

  const isSaveable = !_.isEqual(state.doc, saveableDoc);

  const indexPatternTitles = Object.keys(state.datasourceStates).reduce(
    (arr, datasourceId) => {
      const datasourceState = state.datasourceStates[datasourceId].state;
      const datasource = datasourceMap[datasourceId];
      const layers = datasource.getLayers(datasourceState);
      if (layers.length) {
        arr.push(
          ...datasource
            .getMetaData(datasourceState)
            .filterableIndexPatterns.map(pattern => pattern.title)
        );
      }
      return arr;
    },
    [] as string[]
  );

  // When the route changes, we treat it as an initialization event.
  useEffect(() => {
    initialize({
      setState,
      datasourceMap,
      dateRange: state.dateRange,
      language: state.language,
      docId,
      docStorage,
      visualizationMap,
    }).catch((e: unknown) => {
      toastNotifications.addDanger(
        i18n.translate('xpack.lens.editorFrame.docLoadingError', {
          defaultMessage: 'Error loading saved document',
        })
      );

      redirectTo();
    });
  }, [docId]);

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
                    if (!saveableDoc) {
                      return;
                    }

                    docStorage
                      .save(saveableDoc)
                      .then(({ id }) => {
                        setState({
                          ...state,
                          doc: { ...saveableDoc, id },
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
            indexPatterns={indexPatternTitles}
            store={store}
            showDatePicker={true}
            showQueryInput={true}
            query={state.query}
            dateRangeFrom={state.dateRange && state.dateRange.fromDate}
            dateRangeTo={state.dateRange && state.dateRange.toDate}
            uiSettings={uiSettings}
          />
        </div>

        <div className="lnsAppFrame">
          {!state.isLoading && (
            <EditorFrame
              data-test-subj="lnsEditorFrame"
              framePublicAPI={framePublicAPI}
              onError={onError}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              ExpressionRenderer={expressionRenderer}
              state={state}
              setState={setState}
            />
          )}
        </div>
      </div>
    </I18nProvider>
  );
}
