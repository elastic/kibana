/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/kibana/alerting';
export const BASE_ACTION_API_PATH = '/api/action';
export const BASE_ALERT_API_PATH = '/api/alert';

export const DEFAULT_SECTION: Section = 'actions';
export type Section = 'actions' | 'alerts';

export const routeToHome = `${BASE_PATH}`;
export const routeToActions = `${BASE_PATH}/actions`;
export const routeToAlerts = `${BASE_PATH}/alerts`;
