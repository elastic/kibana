/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { registerMetricThresholdAlertType } from './metric_threshold/register_metric_threshold_alert_type';

const registerAlertTypes = (server: Server) => {
  const { alerting } = server.plugins;
  if (alerting) {
    const registerFns = [registerMetricThresholdAlertType];

    registerFns.forEach(fn => {
      fn(server);
    });
  }
};

export { registerAlertTypes };
