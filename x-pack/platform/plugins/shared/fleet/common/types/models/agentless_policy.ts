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

export interface CloudConnector {
  enabled: boolean;
  cloud_connector_id: string;
}

export interface AgentlessPackage {
  name: string;
  title: string;
  version: string;
}

export interface NewAgentlessPolicy {
  id?: string;
  name: string;
  namespace?: string;
  vars?: SimplifiedVars;
  global_data_tags?: GlobalDataTag[];
  cloud_connector?: CloudConnector | null;
  package?: AgentlessPackage;
  inputs?: SimplifiedInputs;
}

export interface AgentlessPolicy extends NewAgentlessPolicy {
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

/**
 * Type guard distinguishing an AgentlessPolicy response (simplified inputs,
 * no policy_ids) from a PackagePolicy response.
 */
export const isAgentlessPolicyResponse = (
  item: { policy_ids?: string[] } | AgentlessPolicy
): item is AgentlessPolicy => !('policy_ids' in item);
