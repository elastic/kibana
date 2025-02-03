/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import {
  isLensBrushEvent,
  isLensEditEvent,
  isLensFilterEvent,
  isLensMultiFilterEvent,
  isLensTableRowContextMenuClickEvent,
} from '../../types';
import { inferTimeField } from '../../utils';
import type {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensPublicCallbacks,
} from '../types';
import { isTextBasedLanguage } from '../helper';
import { addLog } from '../logger';

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
        // if the embeddable is located in an app where there is the Unified search bar with the ES|QL editor, then use this query
        // otherwise use the query from the saved object
        let esqlQuery: AggregateQuery | Query | undefined;
        if (isTextBasedLanguage(currentState)) {
          const query = data.query.queryString.getQuery();
          esqlQuery = isOfAggregateQueryType(query) ? query : currentState.attributes.state.query;
        }
        uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: {
            ...event.data,
            timeFieldName:
              event.data.timeFieldName || inferTimeField(data.datatableUtilities, event),
            query: esqlQuery,
          },
          embeddable: api,
        });
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec(
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
