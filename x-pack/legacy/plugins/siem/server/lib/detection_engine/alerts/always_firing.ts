/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ActionTypeExecutorOptions, ActionType } from '../../../../../actions';
import { AlertType, AlertExecutorOptions } from '../../../../../alerting';

export const alwaysFiringAlertType: AlertType = {
  id: 'test.always-firing',
  name: 'Test: Always Firing',
  actionGroups: ['default', 'other'],
  async executor({ services, params, state }: AlertExecutorOptions) {
    console.log('[Hello I am in executor]');
    console.group();
    console.log('[params are]', params);
    console.log('[state is]', state);
    console.log('[getState is]', services.alertInstanceFactory('1').getState());
    console.groupEnd();
    // services.replaceState();
    /*
      let group = 'default';

      if (params.groupsToScheduleActionsInSeries) {
        const index = state.groupInSeriesIndex || 0;
        group = params.groupsToScheduleActionsInSeries[index];
      }

      if (group) {
        services
          .alertInstanceFactory('1')
          .replaceState({ instanceStateValue: true })
          .scheduleActions(group, {
            instanceContextValue: true,
          });
      }
      await services.callCluster('index', {
        index: params.index,
        refresh: 'wait_for',
        body: {
          state,
          params,
          reference: params.reference,
          source: 'alert:test.always-firing',
        },
      });
      return {
        globalStateValue: true,
        groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
      };
    */
  },
};

export const rateLimitedActionType: ActionType = {
  id: 'test.rate-limit',
  name: 'Test: Rate Limit',
  maxAttempts: 2,
  validate: {
    params: schema.object({
      index: schema.string(),
      reference: schema.string(),
      retryAt: schema.number(),
    }),
  },
  async executor({ config, params, services }: ActionTypeExecutorOptions) {
    await services.callCluster('index', {
      index: params.index,
      refresh: 'wait_for',
      body: {
        params,
        config,
        reference: params.reference,
        source: 'action:test.rate-limit',
      },
    });
    return {
      status: 'error',
      retry: new Date(params.retryAt),
    };
  },
};
