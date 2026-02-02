/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceState } from '@kbn/alerting-state-types';
import { omit } from 'lodash';

// This function should be removed by https://github.com/elastic/kibana/issues/227534
export function filterAlertState<State extends AlertInstanceState>(state: State): Partial<State> {
  // These fields are supposed to be in the meta not rule type alert state.
  const fieldsToSkip = ['start', 'end', 'duration'];
  return omit(state, fieldsToSkip) as Partial<State>;
}
