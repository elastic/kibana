/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const INFERENCE_SETTINGS_API_PATH = 'internal/search_inference_endpoints/settings';
export const API_VERSION = '1';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': API_VERSION,
} as const;

export const FEATURE_PRIVILEGED_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { searchInferenceEndpoints: ['all'] },
      spaces: ['*'],
    },
  ],
};

export const SAMPLE_FEATURES = {
  agentBuilderAnthropic: {
    feature_id: 'agent_builder',
    endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
  },
  agentBuilderClaudeOpus: {
    feature_id: 'agent_builder',
    endpoints: [{ id: '.anthropic-claude-4.6-opus' }],
  },
  attackDiscoveryClaude: {
    feature_id: 'attack_discovery',
    endpoints: [{ id: '.eis-claude-3.7-sonnet' }],
  },
};
