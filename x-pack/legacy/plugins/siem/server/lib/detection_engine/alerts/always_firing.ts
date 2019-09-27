/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isEmpty } from 'lodash/fp';
import { ActionTypeExecutorOptions, ActionType } from '../../../../../actions';
import { AlertType, AlertExecutorOptions } from '../../../../../alerting';

export const alwaysFiringAlertType: AlertType = {
  id: 'test.always-firing',
  name: 'Test: Always Firing',
  actionGroups: ['default', 'other'],
  async executor({ services, params, state }: AlertExecutorOptions) {
    const instance = services.alertInstanceFactory('1');
    console.log('my state is:', state, 'and also', instance.getState());
    if (isEmpty(instance.getState())) {
      console.log('empty object, changing it...');
      instance.replaceState({
        count: 1,
      });
    } else {
      const instanceState = instance.getState();
      // console.log('not an empty object, changing it with', instanceState.count++);
      instance.replaceState({
        count: instanceState.count + 1,
      });
    }

    instance.scheduleActions('default');
  },
};

// Testing, not using at the moment.
export const rateLimitedActionType: ActionType = {
  id: 'siem.signals',
  name: 'SIEM: Signals',
  maxAttempts: 2,
  validate: {
    params: schema.object({
      index: schema.string(),
    }),
  },
  async executor({ config, params, services }: ActionTypeExecutorOptions) {
    console.log('I am in the executor of the action and am returning status of ok', params);
    return {
      status: 'ok',
    };
    /*
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
    */
  },
};
