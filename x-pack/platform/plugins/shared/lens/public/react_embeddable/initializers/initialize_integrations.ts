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
import type { GetStateType, IntegrationCallbacks, LensSerializedState } from '@kbn/lens-common';
import type {
  LegacyLensStateApi,
  LensByRefSerializedAPIConfig,
  LensSerializedAPIConfig,
} from '@kbn/lens-common-2';
import type { HasSerializableState } from '@kbn/presentation-publishing';
import { isTextBasedLanguage, stripInheritedContext, transformToApiConfig } from '../helper';

export function initializeIntegrations(getLatestState: GetStateType): {
  api: Omit<
    IntegrationCallbacks,
    | 'updateState'
    | 'updateAttributes'
    | 'updateDataViews'
    | 'updateRefId'
    | 'updateOverrides'
    | 'updateDataLoading'
    | 'getTriggerCompatibleActions'
  > &
    HasSerializableState<LensSerializedAPIConfig> &
    LegacyLensStateApi;
} {
  return {
    api: {
      /**
       * This API is used by the parent to serialize the panel state to save it into its saved object.
       * Make sure to remove the attributes when the panel is by reference.
       */
      serializeState: (): LensSerializedAPIConfig => {
        const currentState = stripInheritedContext(getLatestState());

        const { ref_id: refId, attributes, ...state } = currentState;
        if (refId) {
          return {
            ...state,
            ref_id: refId,
          } satisfies LensByRefSerializedAPIConfig;
        }

        const transformedState = transformToApiConfig(currentState);

        return transformedState;
      },
      getLegacySerializedState: (): LensSerializedState => {
        const currentState = getLatestState();
        const { ref_id: refId, attributes, ...state } = currentState;

        if (refId) {
          return {
            ...state,
            ref_id: refId,
          };
        }

        return {
          ...state,
          attributes,
        };
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
