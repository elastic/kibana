/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTORS_API = '**/internal/search_inference_endpoints/connectors**';
export const FLEET_PACKAGES_API = '**/api/fleet/epm/packages**';
export const INTEGRATIONS_LIST_API = '**/api/automatic_import_v2/integrations**';

export const MOCK_CONNECTOR = {
  connectorId: 'test-bedrock-connector',
  type: '.bedrock',
  name: 'Test Bedrock Connector',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

export const CONNECTORS_WITH_ONE = {
  connectors: [MOCK_CONNECTOR],
  allConnectors: [MOCK_CONNECTOR],
  soEntryFound: false,
};

export const CONNECTORS_EMPTY_RESPONSE = {
  connectors: [],
  allConnectors: [],
  soEntryFound: false,
};
