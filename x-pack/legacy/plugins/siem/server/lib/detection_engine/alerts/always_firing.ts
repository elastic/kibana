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
      console.log('not an empty object, changing it...');
    }
  },
};

// Testing, not using at the moment.
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
