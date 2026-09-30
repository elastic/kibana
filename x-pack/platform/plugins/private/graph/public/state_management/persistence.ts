/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'typescript-fsa';
import actionCreatorFactory from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { GraphWorkspaceSavedObject, Workspace } from '../types';
import type { GraphStoreDependencies, GraphState, StartGraphListening } from '.';
import { submitSearch } from '.';
import { datasourceSelector } from './datasource';
import type { IndexpatternDatasource } from './datasource';
import { setDatasource } from './datasource';
import { loadFields, selectedFieldsSelector } from './fields';
import { updateSettings, settingsSelector } from './advanced_settings';
import { loadTemplates, templatesSelector } from './url_templates';
import {
  migrateLegacyIndexPatternRef,
  savedWorkspaceToAppState,
  appStateToSavedWorkspace,
  lookupIndexPatternId,
} from '../services/persistence';
import { updateMetaData, metaDataSelector } from './meta_data';
import type { SaveWorkspaceHandler } from '../services/save_modal';
import { openSaveModal } from '../services/save_modal';
import { getEditPath } from '../services/url';
import { saveSavedWorkspace } from '../helpers/saved_workspace_utils';

export interface LoadSavedWorkspacePayload {
  dataViews: DataViewListItem[];
  savedWorkspace: GraphWorkspaceSavedObject;
  urlQuery: string | null;
}

const actionCreator = actionCreatorFactory('x-pack/graph');

export const loadSavedWorkspace = actionCreator<LoadSavedWorkspacePayload>('LOAD_WORKSPACE');
export const saveWorkspace = actionCreator<GraphWorkspaceSavedObject>('SAVE_WORKSPACE');
export const fillWorkspace = actionCreator<void>('FILL_WORKSPACE');

/**
 * Listener handling loading of a saved workspace.
 *
 * It will load the index pattern associated with the saved object and deserialize all properties
 * into the store. Existing state will be overwritten.
 */
export const registerPersistenceListeners = (
  startListening: StartGraphListening,
  deps: GraphStoreDependencies
) => {
  startListening({
    predicate: loadSavedWorkspace.match,
    effect: async (unknownAction, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const action = unknownAction as unknown as Action<LoadSavedWorkspacePayload>;
      const { dataViews, savedWorkspace, urlQuery } = action.payload;
      const migrationStatus = migrateLegacyIndexPatternRef(savedWorkspace, dataViews);
      if (!migrationStatus.success) {
        deps.notifications.toasts.addDanger(
          i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
            defaultMessage: 'Data view "{name}" not found',
            values: { name: migrationStatus.missingIndexPattern },
          })
        );
        return;
      }

      const selectedIndexPatternId = lookupIndexPatternId(savedWorkspace);
      let indexPattern: DataView;
      try {
        indexPattern = await deps.indexPatternProvider.get(selectedIndexPatternId);
        listenerApi.throwIfCancelled();
      } catch (error) {
        if (listenerApi.signal.aborted) {
          return;
        }
        deps.notifications.toasts.addDanger(
          i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
            defaultMessage: 'Data view "{name}" not found',
            values: { name: selectedIndexPatternId },
          })
        );
        return;
      }

      const createdWorkspace = deps.createWorkspace(
        indexPattern.title,
        settingsSelector(listenerApi.getState())
      );
      const { urlTemplates, advancedSettings, allFields } = savedWorkspaceToAppState(
        savedWorkspace,
        indexPattern,
        createdWorkspace
      );

      // put everything in the store
      listenerApi.dispatch(
        updateMetaData({
          title: savedWorkspace.title,
          description: savedWorkspace.description,
          savedObjectId: savedWorkspace.id,
        })
      );
      listenerApi.dispatch(
        setDatasource({ type: 'indexpattern', id: indexPattern.id!, title: indexPattern.title })
      );
      listenerApi.dispatch(loadFields(allFields));
      listenerApi.dispatch(updateSettings(advancedSettings));
      listenerApi.dispatch(loadTemplates(urlTemplates));
      if (urlQuery) {
        listenerApi.dispatch(submitSearch(urlQuery));
      }
      createdWorkspace.runLayout();
    },
  });

  /**
   * Listener handling saving of current state.
   *
   * It will serialize everything and save it using the saved objects client
   */
  startListening({
    predicate: saveWorkspace.match,
    effect: async (unknownAction, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const action = unknownAction as unknown as Action<GraphWorkspaceSavedObject>;
      const state = listenerApi.getState();
      const workspace = deps.getWorkspace();
      const selectedDatasource = datasourceSelector(state).current;
      if (!workspace || selectedDatasource.type === 'none') {
        return;
      }

      const savedObjectId = await showModal({
        deps,
        workspace,
        savedWorkspace: action.payload,
        state,
        selectedDatasource,
      });
      listenerApi.throwIfCancelled();
      if (savedObjectId) {
        listenerApi.dispatch(updateMetaData({ savedObjectId }));
      }
    },
  });
};

function showModal({
  deps,
  workspace,
  savedWorkspace,
  state,
  selectedDatasource,
}: {
  deps: GraphStoreDependencies;
  workspace: Workspace;
  savedWorkspace: GraphWorkspaceSavedObject;
  state: GraphState;
  selectedDatasource: IndexpatternDatasource;
}): Promise<string | undefined> {
  let resolveSavedObjectId: (id?: string) => void;
  const savedObjectIdPromise = new Promise<string | undefined>((resolve) => {
    resolveSavedObjectId = resolve;
  });

  const saveWorkspaceHandler: SaveWorkspaceHandler = async (
    saveOptions,
    userHasConfirmedSaveWorkspaceData,
    services
  ) => {
    const canSaveData =
      deps.savePolicy === 'configAndData' ||
      (deps.savePolicy === 'configAndDataWithConsent' && userHasConfirmedSaveWorkspaceData);
    appStateToSavedWorkspace(
      savedWorkspace,
      {
        workspace,
        urlTemplates: templatesSelector(state),
        advancedSettings: settingsSelector(state),
        selectedIndex: selectedDatasource,
        selectedFields: selectedFieldsSelector(state),
      },
      canSaveData
    );
    try {
      const id = await saveSavedWorkspace(savedWorkspace, saveOptions, services);
      if (id) {
        const title = i18n.translate('xpack.graph.saveWorkspace.successNotificationTitle', {
          defaultMessage: 'Saved "{workspaceTitle}"',
          values: { workspaceTitle: savedWorkspace.title },
        });
        let text;
        if (!canSaveData && workspace.nodes.length > 0) {
          text = i18n.translate('xpack.graph.saveWorkspace.successNotification.noDataSavedText', {
            defaultMessage: 'The configuration was saved, but the data was not saved',
          });
        }
        deps.notifications.toasts.addSuccess({
          title,
          text,
          'data-test-subj': 'saveGraphSuccess',
        });
        if (savedWorkspace.id !== metaDataSelector(state).savedObjectId) {
          deps.changeUrl(getEditPath(savedWorkspace));
        }
      }
      resolveSavedObjectId(id);
      return { id };
    } catch (error) {
      deps.notifications.toasts.addDanger(
        i18n.translate('xpack.graph.saveWorkspace.savingErrorMessage', {
          defaultMessage: 'Failed to save workspace: {message}',
          values: {
            message: error,
          },
        })
      );
      return { error };
    }
  };

  openSaveModal({
    savePolicy: deps.savePolicy,
    hasData: workspace.nodes.length > 0 || workspace.blocklistedNodes.length > 0,
    workspace: savedWorkspace,
    saveWorkspace: saveWorkspaceHandler,
    services: deps,
  });

  return savedObjectIdPromise;
}
