/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SimplifiedInputs,
  SimplifiedVars,
} from '../../services/simplified_package_policy_helper';

import type { GlobalDataTag } from './agent_policy';

/** Cloud connector as returned in an agentless policy response (always resolved to an id). */
export interface AgentlessCloudConnector {
  enabled: boolean;
  cloud_connector_id: string;
}

/** Integration package as returned in an agentless policy response. */
export interface AgentlessPackage {
  name: string;
  title: string;
  version: string;
}

/**
 * Response DTO returned by the agentless policies API.
 *
 * This models the response only; the create-request contract is derived from the
 * route schema, see `NewAgentlessPolicy` in `../rest_spec/agentless_policy`.
 */
export interface AgentlessPolicy {
  id: string;
  name: string;
  namespace?: string;
  vars?: SimplifiedVars;
  global_data_tags?: GlobalDataTag[];
  cloud_connector?: AgentlessCloudConnector | null;
  package?: AgentlessPackage;
  inputs?: SimplifiedInputs;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}
