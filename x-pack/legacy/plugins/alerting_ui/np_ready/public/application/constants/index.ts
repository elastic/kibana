/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/kibana/alerting';
export const BASE_API_PATH = '../api/action';

export const DEFAULT_SECTION: Section = 'alerts';
export type Section = 'actions' | 'alerts' | 'activity_logs' | 'notifications';

export function linkToHome() {
  return `#${BASE_PATH}`;
}

export function linkToAlerts() {
  return `#${BASE_PATH}/alerts`;
}

export function linkToActions() {
  return `#${BASE_PATH}/actions`;
}

export function linkToActivityLogs() {
  return `#${BASE_PATH}/activity_logs`;
}

export function linkToNotifications() {
  return `#${BASE_PATH}/notifications`;
}
