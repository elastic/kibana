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
import { noop } from 'lodash';
import type { HasSerializableState } from '@kbn/presentation-publishing';
import { emptySerializer, isTextBasedLanguage } from '../helper';
import type { GetStateType, LensEmbeddableStartServices } from '../types';
import type { IntegrationCallbacks } from '../types';

export function initializeIntegrations(
  getLatestState: GetStateType,
  { attributeService }: LensEmbeddableStartServices
): {
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
    HasSerializableState;
  cleanup: () => void;
  serialize: () => {};
  comparators: {};
} {
  return {
    api: {
      /**
       * This API is used by the dashboard to serialize the panel state to save it into its saved object.
       * Make sure to remove the attributes when the panel is by reference.
       */
      serializeState: () => {
        const currentState = getLatestState();
        const cleanedState = attributeService.extractReferences(currentState);
        if (cleanedState.rawState.savedObjectId) {
          return { ...cleanedState, rawState: { ...cleanedState.rawState, attributes: undefined } };
        }
        return cleanedState;
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
    comparators: {},
    serialize: emptySerializer,
    cleanup: noop,
  };
}
