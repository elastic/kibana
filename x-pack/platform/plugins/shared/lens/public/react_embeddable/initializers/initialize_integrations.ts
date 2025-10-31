/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAggregateQueryMode,
  getLanguageDisplayName,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { omit } from 'lodash';
import { type HasSerializableState, type SerializedPanelState } from '@kbn/presentation-publishing';
import type {
  GetStateType,
  LensByRefSerializedState,
  LensByValueSerializedState,
  LensRuntimeState,
  LensSerializedState,
  IntegrationCallbacks,
} from '@kbn/lens-common';
import { isTextBasedLanguage, transformOutputState } from '../helper';

function cleanupSerializedState(state: LensRuntimeState) {
  const cleanedState = omit(state, 'searchSessionId');

  return cleanedState;
}

export function initializeIntegrations(getLatestState: GetStateType): {
  api: Omit<
    IntegrationCallbacks,
    | 'updateState'
    | 'updateAttributes'
    | 'updateDataViews'
    | 'updateSavedObjectId'
    | 'updateOverrides'
    | 'updateDataLoading'
    | 'getTriggerCompatibleActions'
  > &
    HasSerializableState<LensSerializedState>;
} {
  return {
    api: {
      /**
       * This API is used by the parent to serialize the panel state to save it into its saved object.
       * Make sure to remove the attributes when the panel is by reference.
       */
      serializeState: (): SerializedPanelState<LensSerializedState> => {
        const currentState = cleanupSerializedState(getLatestState());

        const { savedObjectId, attributes, ...state } = currentState;

        if (savedObjectId) {
          return {
            rawState: {
              ...state,
              savedObjectId,
            },
          } satisfies SerializedPanelState<LensByRefSerializedState>;
        }

        const transformedState = transformOutputState(currentState);

        return {
          rawState: transformedState,
        } satisfies SerializedPanelState<LensByValueSerializedState>;
      },
      // TODO: workout why we have this duplicated
      getFullAttributes: () => getLatestState().attributes,
      getSavedVis: () => getLatestState().attributes,
      isTextBasedLanguage: () => isTextBasedLanguage(getLatestState()),
      getTextBasedLanguage: () => {
        const query = getLatestState().attributes?.state.query;
        if (!query || !isOfAggregateQueryType(query)) {
          return;
        }
        const language = getAggregateQueryMode(query);
        return getLanguageDisplayName(language).toUpperCase();
      },
    },
  };
}
