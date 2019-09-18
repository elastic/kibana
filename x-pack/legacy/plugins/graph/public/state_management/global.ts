/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, call, put } from 'redux-saga/effects';
import { GraphWorkspaceSavedObject } from '../types';
import {
  GraphStoreDependencies,
  setDatasource,
  loadFields,
  updateSettings,
  loadTemplates,
} from '.';
import { lookupIndexPattern, savedWorkspaceToAppState } from '../services/persistence';
const actionCreator = actionCreatorFactory('x-pack/graph');

export const reset = actionCreator<void>('RESET');
export const loadSavedWorkspace = actionCreator<GraphWorkspaceSavedObject>('LOAD_WORKSPACE');

/**
 * Saga handling loading of a saved workspace.
 *
 * It will load the index pattern associated with the saved object and deserialize all properties
 * into the store. Existing state will be overwritten.
 */
export const loadingSaga = ({
  createWorkspace,
  getWorkspace,
  indexPatterns,
  notifications,
  indexPatternProvider,
}: Pick<
  GraphStoreDependencies,
  'createWorkspace' | 'getWorkspace' | 'indexPatterns' | 'notifications' | 'indexPatternProvider'
>) =>
  function*() {
    function* deserializeWorkspace(action: Action<GraphWorkspaceSavedObject>) {
      const selectedIndex = lookupIndexPattern(action.payload, indexPatterns);
      if (!selectedIndex) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.graph.loadWorkspace.missingIndexPatternErrorMessage', {
            defaultMessage: 'Index pattern not found',
          })
        );
        return;
      }

      const indexPattern = yield call(indexPatternProvider.get, selectedIndex.id);

      createWorkspace(selectedIndex.attributes.title);

      const { urlTemplates, advancedSettings, allFields } = savedWorkspaceToAppState(
        action.payload,
        indexPattern,
        // workspace won't be null because it's created in the same call stack
        getWorkspace()!
      );

      // put everything in the store
      yield put(
        setDatasource({
          type: 'indexpattern',
          id: selectedIndex.id,
          title: selectedIndex.attributes.title,
        })
      );
      yield put(loadFields(allFields));
      yield put(updateSettings(advancedSettings));
      yield put(loadTemplates(urlTemplates));

      // workspace won't be null because it's created in the same call stack
      getWorkspace()!.runLayout();
    }

    yield takeLatest(loadSavedWorkspace.match, deserializeWorkspace);
  };
