/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { registerErrorOccurrenceAlertType } from './error_occurrence/register_error_occurrence_alert_type';

const registerAlertTypes = (core: InternalCoreSetup) => {
  const { server } = core.http;

  const { alerting } = server.plugins;

  if (alerting) {
    const registerFns = [registerErrorOccurrenceAlertType];

    registerFns.forEach(fn => {
      fn(core);
    });
  }
};

export { registerAlertTypes };
