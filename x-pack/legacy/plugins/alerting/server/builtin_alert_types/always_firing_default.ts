/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is a "demo" alert type, which always fires it's default action group
// when the executor is run.

import { AlertExecutorOptions, AlertType } from '../types';

export const alertType: AlertType = {
  id: '.always-firing-default',
  name: 'Alert that always fires the default action group when run',
  async executor({ services, params, state }: AlertExecutorOptions) {
    services.alertInstanceFactory(`${__filename}:.always-firing`).fire('default', {});
  },
};
