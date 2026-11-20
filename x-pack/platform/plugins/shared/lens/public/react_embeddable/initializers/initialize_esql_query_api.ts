/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CanUpdateESQLQuery } from '@kbn/esql-types';
import type { GetStateType, IntegrationCallbacks, TextBasedPersistedState } from '@kbn/lens-common';
import { getTextBasedLayerQueries } from '@kbn/lens-common';

/**
 * Lets the container rewrite the ES|QL query of a by-value panel with a single ES|QL layer.
 * By-reference panels are excluded because the change would affect every usage of the library item.
 */
export const initializeESQLQueryApi = (
  getLatestState: GetStateType,
  updateAttributes: IntegrationCallbacks['updateAttributes']
): CanUpdateESQLQuery => {
  const getEditableESQLQuery = () => {
    const { ref_id: refId, attributes } = getLatestState();
    if (refId) {
      return undefined;
    }
    const layerQueries = getTextBasedLayerQueries(attributes);
    return layerQueries.length === 1 ? layerQueries[0].esql : undefined;
  };

  return {
    getEditableESQLQuery,
    updateESQLQuery: (esql: string) => {
      if (getEditableESQLQuery() === undefined) {
        return;
      }
      const { attributes } = getLatestState();
      // datasourceStates is untyped, the layers were already verified by getEditableESQLQuery
      const textBased = attributes.state.datasourceStates.textBased as
        | Partial<TextBasedPersistedState>
        | undefined;
      if (!textBased?.layers) {
        return;
      }
      updateAttributes({
        ...attributes,
        state: {
          ...attributes.state,
          datasourceStates: {
            ...attributes.state.datasourceStates,
            textBased: {
              ...textBased,
              layers: Object.fromEntries(
                Object.entries(textBased.layers).map(([layerId, layer]) => [
                  layerId,
                  { ...layer, query: { esql } },
                ])
              ),
            },
          },
        },
      });
    },
  };
};
