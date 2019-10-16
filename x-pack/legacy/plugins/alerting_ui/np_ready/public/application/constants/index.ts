/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/kibana/alerting';
export const BASE_ACTION_API_PATH = '../api/action';

export const DEFAULT_SECTION: Section = 'actions';
export type Section = 'actions';

export function linkToHome() {
  return `#${BASE_PATH}`;
}

export function linkToActions() {
  return `#${BASE_PATH}/actions`;
}
