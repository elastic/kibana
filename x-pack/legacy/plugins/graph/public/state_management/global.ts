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
import { updateMetaData } from './meta_data';
const actionCreator = actionCreatorFactory('x-pack/graph');

export const reset = actionCreator<void>('RESET');
export const loadSavedWorkspace = actionCreator<GraphWorkspaceSavedObject>('LOAD_WORKSPACE');
export const saveWorkspace = actionCreator<void>('SAVE_WORKSPACE');

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
      yield put(updateMetaData({
        title: action.payload.title,
        description: action.payload.description
      }));
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

/**
 * Saga handling saving of current state.
 *
 * It will serialize everything and save it using the saved objects client
 */
export const savingSaga = ({
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
    function* persistWorkspace(action: Action<GraphWorkspaceSavedObject>) {
        openSaveModal({
          savePolicy: graphSavePolicy,
          hasData: $scope.workspace && ($scope.workspace.nodes.length > 0 || $scope.workspace.blacklistedNodes.length > 0),
          workspace: $scope.savedWorkspace,
          saveWorkspace: function (saveOptions, userHasConfirmedSaveWorkspaceData) {
    const canSaveData = graphSavePolicy === 'configAndData' ||
      (graphSavePolicy === 'configAndDataWithConsent' && userHasConfirmedSaveWorkspaceData);

    appStateToSavedWorkspace(
      $scope.savedWorkspace,
      {
        workspace: $scope.workspace,
        urlTemplates: $scope.urlTemplates,
        advancedSettings: $scope.exploreControls,
        selectedIndex: $scope.selectedIndex,
        selectedFields: $scope.selectedFields
      },
      canSaveData
    );

    return $scope.savedWorkspace.save(saveOptions).then(function (id) {
      if (id) {
        const title = i18n.translate('xpack.graph.saveWorkspace.successNotificationTitle', {
          defaultMessage: 'Saved "{workspaceTitle}"',
          values: { workspaceTitle: $scope.savedWorkspace.title },
        });
        let text;
        if (!canSaveData && $scope.workspace.nodes.length > 0) {
          text = i18n.translate('xpack.graph.saveWorkspace.successNotification.noDataSavedText', {
            defaultMessage: 'The configuration was saved, but the data was not saved',
          });
        }

        toastNotifications.addSuccess({
          title,
          text,
          'data-test-subj': 'saveGraphSuccess',
        });
        if ($scope.savedWorkspace.id !== $route.current.params.id) {
          kbnUrl.change(getEditPath($scope.savedWorkspace));
        }
      }
      return { id };
    }, fatalError);
        });
    }

    yield takeLatest(saveWorkspace.match, persistWorkspace);
  };
