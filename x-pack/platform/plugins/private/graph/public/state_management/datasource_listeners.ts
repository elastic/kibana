/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Action } from 'typescript-fsa';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { GraphStoreDependencies, StartGraphListening } from './store';
import { loadFields } from './fields';
import { mapFields } from '../services/persistence';
import { settingsSelector } from './advanced_settings';
import type { IndexpatternDatasource } from './datasource';
import { datasourceLoaded, setDatasource, requestDatasource } from './datasource';

/**
 * Listener loading field information when the datasource is switched. This will overwrite current settings
 * in fields.
 *
 * TODO: Carry over fields than can be carried over because they also exist in the target index pattern
 */
export const registerDatasourceListeners = (
  startListening: StartGraphListening,
  { indexPatternProvider, notifications, createWorkspace, notifyReact }: GraphStoreDependencies
) => {
  startListening({
    predicate: requestDatasource.match,
    effect: async (unknownAction, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const action = unknownAction as unknown as Action<IndexpatternDatasource>;

      let indexPattern: DataView;
      try {
        indexPattern = await indexPatternProvider.get(action.payload.id);
        listenerApi.throwIfCancelled();
      } catch (error) {
        if (listenerApi.signal.aborted) {
          return;
        }
        // in case of errors, reset the datasource and show notification
        listenerApi.dispatch(setDatasource({ type: 'none' }));
        notifications.toasts.addDanger(
          i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
            defaultMessage: 'Data view "{name}" not found',
            values: { name: action.payload.title },
          })
        );
        return;
      }

      listenerApi.dispatch(loadFields(mapFields(indexPattern)));
      listenerApi.dispatch(datasourceLoaded());
      createWorkspace(indexPattern.title, settingsSelector(listenerApi.getState()));
      notifyReact();
    },
  });
};
