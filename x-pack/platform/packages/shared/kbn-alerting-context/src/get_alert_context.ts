/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiSupportsPassThroughContext } from '@kbn/presentation-containers';
import { isAlertInPassThroughContext } from './type_guards';
import { AlertContext } from './types';

export function getAlertContext(api: unknown): AlertContext | undefined {
  if (!apiSupportsPassThroughContext(api)) return;

  const passThroughContext = api.getPassThroughContext();

  if (!isAlertInPassThroughContext(passThroughContext)) return;

  return passThroughContext;
}
