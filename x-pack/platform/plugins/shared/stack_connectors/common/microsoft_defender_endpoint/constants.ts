/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MICROSOFT_DEFENDER_ENDPOINT_TITLE = 'Microsoft Defender for Endpoint';
export const MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID = '.microsoft_defender_endpoint';

export enum MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION {
  TEST_CONNECTOR = 'testConnector',
  GET_AGENT_DETAILS = 'getAgentDetails',
  GET_AGENT_LIST = 'getAgentList',
  ISOLATE_HOST = 'isolateHost',
  RELEASE_HOST = 'releaseHost',
  GET_ACTIONS = 'getActions',
  GET_LIBRARY_FILES = 'getLibraryFiles',
  RUN_SCRIPT = 'runScript',
  GET_ACTION_RESULTS = 'getActionResults',
}
