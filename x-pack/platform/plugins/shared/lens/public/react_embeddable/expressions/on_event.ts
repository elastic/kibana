/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { GetStateType, LensPublicCallbacks } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import {
  isLensAlertRule,
  isLensBrushEvent,
  isLensEditEvent,
  isLensFilterEvent,
  isLensMultiFilterEvent,
  isLensTableRowContextMenuClickEvent,
} from '../../types_guards';
import { inferTimeField } from '../../utils';

import { addLog } from '../logger';
import type { LensEmbeddableStartServices } from '../types';

export const prepareEventHandler =
  (
    api: LensApi,
    getState: GetStateType,
    callbacks: LensPublicCallbacks,
    { data, uiActions, visualizationMap }: LensEmbeddableStartServices,
    disableTriggers: boolean | undefined
  ) =>
  async (event: ExpressionRendererEvent) => {
    if (!uiActions?.getTrigger || disableTriggers) {
      return;
    }
    addLog(`onEvent$`);

    let eventHandler:
      | LensPublicCallbacks['onBrushEnd']
      | LensPublicCallbacks['onFilter']
      | LensPublicCallbacks['onTableRowClick'];
    let shouldExecuteDefaultTriggers = true;

    if (isLensBrushEvent(event)) {
      eventHandler = callbacks.onBrushEnd;
    } else if (isLensFilterEvent(event) || isLensMultiFilterEvent(event)) {
      eventHandler = callbacks.onFilter;
    } else if (isLensTableRowContextMenuClickEvent(event)) {
      eventHandler = callbacks.onTableRowClick;
    } else if (isLensAlertRule(event)) {
      // TODO: here is where we run the uiActions on the embeddable for the alert rule
      eventHandler = callbacks.onAlertRule;
      if (shouldExecuteDefaultTriggers) {
        // this runs the function that we define in addTriggerActionAsync in the plugin.ts file in alertRulesDefinition
        uiActions.executeTriggerActions(
          VIS_EVENT_TO_TRIGGER[event.name],
          {
            data: event.data,
            embeddable: api,
          },
          true
        );
      }
    }
    const currentState = getState();

    eventHandler?.({
      ...event.data,
      preventDefault: () => {
        shouldExecuteDefaultTriggers = false;
      },
    });

    if (isLensFilterEvent(event) || isLensMultiFilterEvent(event) || isLensBrushEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        uiActions.executeTriggerActions(VIS_EVENT_TO_TRIGGER[event.name], {
          data: {
            ...event.data,
            timeFieldName:
              event.data.timeFieldName || inferTimeField(data.datatableUtilities, event),
            query: data.query.queryString.getQuery(),
          },
          embeddable: api,
        });
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        uiActions.executeTriggerActions(
          VIS_EVENT_TO_TRIGGER[event.name],
          {
            data: event.data,
            embeddable: api,
          },
          true
        );
      }
    }

    const onEditAction = currentState.attributes.visualizationType
      ? visualizationMap[currentState.attributes.visualizationType]?.onEditAction
      : undefined;

    // We allow for edit actions in the Embeddable for display purposes only (e.g. changing the datatable sort order).
    // No state changes made here with an edit action are persisted.
    if (isLensEditEvent(event) && onEditAction) {
      // updating the state would trigger a reload
      api.updateAttributes({
        ...currentState.attributes,
        state: {
          ...currentState.attributes.state,
          visualization: onEditAction(currentState.attributes.state.visualization, event),
        },
      });
    }
  };
