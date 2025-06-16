/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import {
  isApiESQLVariablesCompatible,
  TypedLensSerializedState,
} from '../../../react_embeddable/types';

export const useESQLVariables = ({
  parentApi,
  attributes,
  panelId,
  closeFlyout,
}: {
  parentApi: unknown;
  attributes?: TypedLensSerializedState['attributes'];
  panelId?: string;
  closeFlyout?: () => void;
}) => {
  const dashboardPanels = useStateFromPublishingSubject(
    isApiESQLVariablesCompatible(parentApi) ? parentApi?.children$ : new BehaviorSubject(undefined)
  );
  const controlGroupApi = useStateFromPublishingSubject(
    isApiESQLVariablesCompatible(parentApi)
      ? parentApi?.controlGroupApi$
      : new BehaviorSubject(undefined)
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
      if (!panelId) {
        return;
      }

      // add a new control
      controlGroupApi?.addNewPanel?.({
        panelType: 'esqlControl',
        serializedState: {
          rawState: {
            ...controlState,
          },
        },
      });
      if (panel && updatedQuery && attributes) {
        panel.updateAttributes({
          ...attributes,
          state: {
            ...attributes.state,
            query: { esql: updatedQuery },
            needsRefresh: true,
          },
        });
        // open the edit flyout to continue editing
        await panel.onEdit();
      }
    },
    [attributes, controlGroupApi, panel, panelId]
  );

  const onCancelControl = useCallback(() => {
    closeFlyout?.();
    if (panel) {
      panel.onEdit();
    }
  }, [closeFlyout, panel]);

  return { onSaveControl, onCancelControl };
};
