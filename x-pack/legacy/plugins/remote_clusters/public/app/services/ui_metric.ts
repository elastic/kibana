/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIM_APP_NAME } from '../constants';

export let track: any;

export function init(_track: any): void {
  track = _track;
}

export function trackUiMetric(actionType: string): any {
  return track(UIM_APP_NAME, actionType);
}
