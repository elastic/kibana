/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
export const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
export const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds
export enum LogFormat {
  JSON = 'json',
  NDJSON = 'ndjson',
  CSV = 'csv',
  STRUCTURED = 'structured',
  UNSTRUCTURED = 'unstructured',
}
export const FLEET_ALL_ROLE = 'fleet-all' as const;
export const INTEGRATIONS_ALL_ROLE = 'integrations-all' as const;
export const ACTIONS_AND_CONNECTORS_ALL_ROLE = 'actions:execute-advanced-connectors' as const;
