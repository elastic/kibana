/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecutorOptions, AlertType } from '../types';

export const alertType: AlertType = {
  id: '.always-firing',
  name: 'Alert that always fires actions when run',
  actionGroups: ['default'],
  async executor({ services, params, state }: AlertExecutorOptions) {
    if (state == null) state = {};
    if (state.count == null) state.count = 0;

    const context = {
      date: new Date().toISOString(),
      count: state.count,
    };

    services.alertInstanceFactory('').scheduleActions('default', context);

    state.count++;
    return state;
  },
};
