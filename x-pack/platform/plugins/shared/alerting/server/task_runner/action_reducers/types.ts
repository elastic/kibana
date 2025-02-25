/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert';
import { AlertInstanceContext, AlertInstanceState, SanitizedRule } from '../../../common';

export interface ReducerOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  rule: SanitizedRule;
  alerts: Array<Alert<State, Context>>;
}
