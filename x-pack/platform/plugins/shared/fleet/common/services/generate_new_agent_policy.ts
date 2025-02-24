/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataTypes } from '../constants';

import type { AgentPolicy, NewAgentPolicy } from '../types';

const TWO_WEEKS_SECONDS = 1209600;
// create a new agent policy with the defaults set
// used by forms which create new agent policies for initial state value
export function generateNewAgentPolicyWithDefaults(
  overrideProps: Partial<NewAgentPolicy> = {}
): NewAgentPolicy {
  return {
    name: '',
    description: '',
    namespace: 'default',
    monitoring_enabled: Object.values(dataTypes),
    inactivity_timeout: TWO_WEEKS_SECONDS,
    is_protected: false,
    ...overrideProps,
  };
}

export function agentPolicyWithoutPaidFeatures(
  agentPolicy: Partial<AgentPolicy>
): Partial<AgentPolicy> {
  return {
    ...agentPolicy,
    is_protected: false,
  };
}
