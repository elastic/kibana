/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalDataTag } from './agent_policy';
import type {
  SimplifiedInputs,
  SimplifiedVars,
} from '../../services/simplified_package_policy_helper';

export interface AgentlessCloudConnector {
  enabled: boolean;
  cloud_connector_id: string;
}

export interface AgentlessPackage {
  name: string;
  title: string;
  version: string;
}

/** Request body for creating an agentless policy via the agentless policies API. */
export interface NewAgentlessPolicy {
  id?: string;
  name: string;
  namespace?: string;
  vars?: SimplifiedVars;
  global_data_tags?: GlobalDataTag[];
  cloud_connector?: AgentlessCloudConnector | null;
  package?: AgentlessPackage;
  inputs?: SimplifiedInputs;
}

/** Response DTO returned by the agentless policies API (simplified inputs, no policy_ids). */
export interface AgentlessPolicy extends NewAgentlessPolicy {
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}
