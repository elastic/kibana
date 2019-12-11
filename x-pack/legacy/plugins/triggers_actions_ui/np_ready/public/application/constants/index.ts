/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/kibana/triggersActions';
export const BASE_ACTION_API_PATH = '/api/action';
export const BASE_ALERT_API_PATH = '/api/alert';

export type Section = 'connectors' | 'alerts';

export const routeToHome = `${BASE_PATH}`;
export const routeToConnectors = `${BASE_PATH}/connectors`;
export const routeToAlerts = `${BASE_PATH}/alerts`;

export { COMPARATORS } from './comparators';
export { AGGREGATION_TYPES } from './aggregation_types';
export { TIME_UNITS } from './time_units';
export { expressionFields } from './expression_fields';
export const SORT_ORDERS: { [key: string]: string } = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
};
