/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import {
  getAggregateQueryMode,
  getLanguageDisplayName,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { omit } from 'lodash';
import {
  SAVED_OBJECT_REF_NAME,
  type HasSerializableState,
  type SerializedPanelState,
} from '@kbn/presentation-publishing';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { isTextBasedLanguage } from '../helper';
import type { GetStateType, LensEmbeddableStartServices, LensRuntimeState } from '../types';
import type { IntegrationCallbacks } from '../types';
import { DOC_TYPE } from '../../../common/constants';

function cleanupSerializedState({
  rawState,
  references,
}: {
  rawState: LensRuntimeState;
  references: Reference[];
}) {
  const cleanedState = omit(rawState, 'searchSessionId');
  return {
    rawState: cleanedState,
    references,
  };
}

export function initializeIntegrations(
  getLatestState: GetStateType,
  serializeDynamicActions: (() => SerializedPanelState<DynamicActionsSerializedState>) | undefined,
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
} {
  return {
    api: {
      /**
       * This API is used by the parent to serialize the panel state to save it into its saved object.
       * Make sure to remove the attributes when the panel is by reference.
       */
      serializeState: () => {
        const currentState = getLatestState();
        const cleanedState = cleanupSerializedState(
          attributeService.extractReferences(currentState)
        );
        const { rawState: dynamicActionsState, references: dynamicActionsReferences } =
          serializeDynamicActions?.() ?? {};
        if (cleanedState.rawState.savedObjectId) {
          const { savedObjectId, attributes, ...byRefState } = cleanedState.rawState;
          return {
            rawState: {
              ...byRefState,
              ...dynamicActionsState,
            },
            references: [
              ...cleanedState.references,
              ...(dynamicActionsReferences ?? []),
              {
                name: SAVED_OBJECT_REF_NAME,
                type: DOC_TYPE,
                id: savedObjectId,
              },
            ],
          };
        }
        return {
          rawState: {
            ...cleanedState.rawState,
            ...dynamicActionsState,
          },
          references: [...cleanedState.references, ...(dynamicActionsReferences ?? [])],
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
