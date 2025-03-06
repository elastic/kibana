/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema/src/types/object_type';
import { omit } from 'lodash';
import { NormalizedAlertAction, NormalizedSystemAction } from '../../rules_client';
import { actionsSchema, systemActionsSchema } from './actions_schema';

export const rewriteActionsReq = (
  actions: TypeOf<typeof actionsSchema>
): NormalizedAlertAction[] => {
  if (!actions) return [];

  return actions.map(
    ({
      frequency,
      alerts_filter: alertsFilter,
      use_alert_data_for_template: useAlertDataForTemplate,
      ...action
    }) => {
      return {
        group: action.group ?? 'default',
        id: action.id,
        params: action.params,
        ...(action.uuid ? { uuid: action.uuid } : {}),
        ...(typeof useAlertDataForTemplate !== 'undefined' ? { useAlertDataForTemplate } : {}),
        ...(frequency
          ? {
              frequency: {
                ...omit(frequency, 'notify_when'),
                summary: frequency.summary,
                throttle: frequency.throttle,
                notifyWhen: frequency.notify_when,
              },
            }
          : {}),
        ...(alertsFilter ? { alertsFilter } : {}),
      };
    }
  );
};

export const rewriteSystemActionsReq = (
  actions: TypeOf<typeof systemActionsSchema>
): NormalizedSystemAction[] => {
  if (!actions) return [];

  return actions.map((action) => {
    return {
      id: action.id,
      params: action.params,
      ...(action.uuid ? { uuid: action.uuid } : {}),
    };
  });
};
