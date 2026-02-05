/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { RawValue } from '../../common/constants';
import type { MapApi } from './types';
import { getUiActions } from '../kibana_services';
import { isUrlDrilldown, toValueClickDataFormat } from '../trigger_actions/trigger_utils';

export function initializeActionHandlers(getApi: () => MapApi | undefined) {
  function getActionContext() {
    const trigger = getUiActions().getTrigger(APPLY_FILTER_TRIGGER);
    if (!trigger) {
      throw new Error('Unable to get context, could not locate trigger');
    }
    return {
      embeddable: getApi(),
      trigger,
    } as ActionExecutionContext;
  }

  return {
    addFilters: async (filters: Filter[], actionId: string = ACTION_GLOBAL_APPLY_FILTER) => {
      const executeContext = {
        ...getActionContext(),
        filters,
      };
      const action = await getUiActions().getAction(actionId);
      if (!action) {
        throw new Error('Unable to apply filter, could not locate action');
      }
      action.execute(executeContext);
    },
    getActionContext,
    getFilterActions: async () => {
      const filterActions = await getUiActions().getTriggerCompatibleActions(APPLY_FILTER_TRIGGER, {
        embeddable: getApi(),
        filters: [],
      });
      const valueClickActions = await getUiActions().getTriggerCompatibleActions(
        VALUE_CLICK_TRIGGER,
        {
          embeddable: getApi(),
          data: {
            // uiActions.getTriggerCompatibleActions validates action with provided context
            // so if event.key and event.value are used in the URL template but can not be parsed from context
            // then the action is filtered out.
            // To prevent filtering out actions, provide dummy context when initially fetching actions.
            data: toValueClickDataFormat('anyfield', 'anyvalue'),
          },
        }
      );
      return [...filterActions, ...valueClickActions.filter(isUrlDrilldown)];
    },
    onSingleValueTrigger: async (actionId: string, key: string, value: RawValue) => {
      const action = await getUiActions().getAction(actionId);
      if (!action) {
        throw new Error('Unable to apply action, could not locate action');
      }
      const executeContext = {
        ...getActionContext(),
        data: {
          data: toValueClickDataFormat(key, value),
        },
      };
      action.execute(executeContext);
    },
  };
}
