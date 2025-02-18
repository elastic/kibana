/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../../common';

export const backfillAgentPolicyToV4: SavedObjectModelDataBackfillFn<AgentPolicy, AgentPolicy> = (
  agentPolicyDoc
) => {
  const advancedSettings = agentPolicyDoc.attributes.advanced_settings;
  if (advancedSettings?.agent_monitoring_http) {
    agentPolicyDoc.attributes.monitoring_http = {
      enabled: advancedSettings.agent_monitoring_http.enabled,
      host: advancedSettings.agent_monitoring_http.host,
      port: advancedSettings.agent_monitoring_http.port,
    };
    delete advancedSettings.agent_monitoring_http;
  }
  return agentPolicyDoc;
};
