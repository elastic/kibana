/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';

export function isAlertInPassThroughContext(
  passThroughContext: unknown
): passThroughContext is { alert: { start: string } } {
  return isObject(passThroughContext) && Object.hasOwn(passThroughContext, 'alert');
}
