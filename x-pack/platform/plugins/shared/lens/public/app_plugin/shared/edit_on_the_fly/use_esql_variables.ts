/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import { ESQL_CONTROL } from '@kbn/controls-constants';

export const useESQLVariables = ({
  parentApi,
  attributes,
  panelId,
  layerId,
  closeFlyout,
}: {
  parentApi: unknown;
  attributes?: TypedLensSerializedState['attributes'];
  panelId?: string;
  layerId: string;
  closeFlyout?: () => void;
}) => {
  const dashboardPanels = useStateFromPublishingSubject(
    apiIsPresentationContainer(parentApi) ? parentApi?.children$ : new BehaviorSubject(undefined)
  );

  const panel = useMemo(() => {
    if (!panelId) {
      return;
    }
    return dashboardPanels?.[panelId] as {
      updateAttributes: (attributes: TypedLensSerializedState['attributes']) => void;
      onEdit: () => Promise<void>;
    };
  }, [dashboardPanels, panelId]);

  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (
        !panelId ||
        !apiPublishesESQLVariables(parentApi) ||
        !apiIsPresentationContainer(parentApi)
      ) {
        return;
      }

      // add a new control
      await parentApi.addNewPanel(
        {
          panelType: ESQL_CONTROL,
          serializedState: {
            ...controlState,
          },
        },
        {
          beside: panelId,
        }
      );
      if (panel && updatedQuery && attributes) {
        // ES|QL lives exclusively on the text-based layers; update only the
        // layer being edited — sibling layers keep their own queries
        const textBasedState = attributes.state.datasourceStates.textBased;
        const editedLayer = textBasedState?.layers?.[layerId];
        const updatedTextBasedState =
          textBasedState && editedLayer
            ? {
                ...textBasedState,
                layers: {
                  ...textBasedState.layers,
                  [layerId]: { ...editedLayer, query: { esql: updatedQuery } },
                },
              }
            : undefined;
        panel.updateAttributes({
          ...attributes,
          state: {
            ...attributes.state,
            ...(updatedTextBasedState
              ? {
                  datasourceStates: {
                    ...attributes.state.datasourceStates,
                    textBased: updatedTextBasedState,
                  },
                }
              : {}),
            needsRefresh: true,
          },
        });
        // open the edit flyout to continue editing
        await panel.onEdit();
      }
    },
    [attributes, parentApi, panel, panelId, layerId]
  );

  const onCancelControl = useCallback(() => {
    closeFlyout?.();
    if (panel) {
      panel.onEdit();
    }
  }, [closeFlyout, panel]);

  return { onSaveControl, onCancelControl };
};
