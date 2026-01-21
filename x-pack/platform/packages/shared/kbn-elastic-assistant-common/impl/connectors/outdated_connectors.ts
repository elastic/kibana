/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ELASTIC_MANAGED_LLM_CONNECTOR_ID = 'Elastic-Managed-LLM';
export const GENERAL_PURPOSE_LLM_V1_CONNECTOR_ID = 'General-Purpose-LLM-v1';
export const GENERAL_PURPOSE_LLM_V2_CONNECTOR_ID = 'General-Purpose-LLM-v2';

export const OUTDATED_ELASTIC_MANAGED_CONNECTOR_IDS = [
  ELASTIC_MANAGED_LLM_CONNECTOR_ID,
  GENERAL_PURPOSE_LLM_V1_CONNECTOR_ID,
];

export const ANTHROPIC_CLAUDE_SONNET_3_7_CONNECTOR_ID = 'Anthropic-Claude-Sonnet-3-7';

export const resolveConnectorId = (connectorId: string) => {
  if (OUTDATED_ELASTIC_MANAGED_CONNECTOR_IDS.includes(connectorId)) {
    return ANTHROPIC_CLAUDE_SONNET_3_7_CONNECTOR_ID;
  }
  return connectorId;
};
