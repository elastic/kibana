/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { Storage } from 'ui/storage';
import { toastNotifications } from 'ui/notify';
import { Chrome } from 'ui/chrome';
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
  QueryBar: QuerySetup['ui']['QueryBar'];
  redirectTo: (id?: string) => void;
}) {
  const uiSettings = chrome.getUiSettingsClient();
  const timeDefaults = uiSettings.get('timepicker:timeDefaults');
  const language = store.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>({
    query: { query: '', language },
    dateRange: {
      fromDate: timeDefaults.from,
      toDate: timeDefaults.to,
    },
    indexPatterns: [],
  });

  useEffect(() => {
    if (docId && (!state.persistedDoc || state.persistedDoc.id !== docId)) {
      docStorage
        .load(docId)
        .then(doc => {
          setState({
            ...state,
            persistedDoc: doc,
          });
        })
        .catch(() => {
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
  const isSaveable =
    state.lastKnownDoc &&
    (!state.persistedDoc ||
      (state.persistedDoc && !_.isEqual(state.lastKnownDoc, state.persistedDoc)));

  return (
    <I18nProvider>
      <div className="lnsApp">
        <div className="lnsAppHeader">
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
              data-test-subj="lnsApp_saveButton"
              onClick={() => {
                if (isSaveable && state.lastKnownDoc) {
                  docStorage
                    .save(state.lastKnownDoc)
                    .then(({ id }) => {
                      // Prevents unnecessary network request and disables save button
                      const newDoc = { ...(state.lastKnownDoc as Document), id };
                      setState({
                        ...state,
                        persistedDoc: newDoc,
                        lastKnownDoc: newDoc,
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
