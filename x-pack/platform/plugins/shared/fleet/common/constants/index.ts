/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_STATUS_CHANGE_DATA_STREAM_NAME } from './agent';

export { INTEGRATIONS_PLUGIN_ID, PLUGIN_ID } from './plugin';
export {
  INGEST_SAVED_OBJECT_INDEX,
  FLEET_SETUP_LOCK_TYPE,
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
} from './saved_objects';
export * from './routes';
export * from './agent';
export * from './agent_policy';
export * from './agentless';
export * from './package_policy';
export * from './epm';
export * from './output';
export * from './enrollment_api_key';
export * from './settings';
export * from './preconfiguration';
export * from './download_source';
export * from './fleet_server_policy_config';
export * from './authz';
export * from './file_storage';
export * from './message_signing_keys';
export * from './locators';
export * from './secrets';
export * from './uninstall_token';
export * from './space_awareness';
export * from './security_search_ai_lake';
export * from './cloud_connector';

// TODO: This is the default `index.max_result_window` ES setting, which dictates
// the maximum amount of results allowed to be returned from a search. It's possible
// for the actual setting to differ from the default. Can we retrieve the real
// setting in the future?
export const SO_SEARCH_LIMIT = 10000;

export const ES_SEARCH_LIMIT = 10000;

export const FLEET_SERVER_INDICES_VERSION = 1;

export const FLEET_SERVER_ARTIFACTS_INDEX = '.fleet-artifacts';

export const FLEET_SERVER_INDICES = [
  '.fleet-actions',
  '.fleet-actions-results',
  '.fleet-agents',
  FLEET_SERVER_ARTIFACTS_INDEX,
  '.fleet-enrollment-api-keys',
  '.fleet-policies',
  '.fleet-policies-leader',
];

// Nodes that can be queried by datastreams API
// Warm and cold nodes have been excluded because of performance issues
export const DATA_TIERS = ['data_hot'];

export const FLEET_ENROLLMENT_API_PREFIX = 'fleet-enrollment-api-keys';

export const REQUEST_DIAGNOSTICS_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours;

export * from './mappings';

export const AUTO_UPGRADE_DEFAULT_RETRIES = ['30m', '1h', '2h', '4h', '8h', '16h', '24h'];

export const FLEET_LOG_INDICES = [AGENT_STATUS_CHANGE_DATA_STREAM_NAME];
