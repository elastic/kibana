/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeRegistry } from '../alert_type_registry';

import { alertType as alwaysFiringAlertType } from './always_firing';

export function registerBuiltInActionTypes(alertTypeRegistry: AlertTypeRegistry) {
  alertTypeRegistry.register(alwaysFiringAlertType);
}
