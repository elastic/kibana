/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassifiedPolicyId } from './version_specific_policies_utils';

/**
 * Shared table of policy ids and their expected classification. The policy id suffix rules are
 * implemented in several places (`classifyPolicyId`, the `policy_base_id` backfill Painless script,
 * the telemetry `regexp` query), and every implementation is tested against this one table so they
 * cannot silently diverge. Add a row here when the accepted suffixes change.
 */
export const POLICY_ID_FIXTURES: Array<{ policyId: string } & ClassifiedPolicyId> = [
  { policyId: 'policy1', kind: 'base', baseId: 'policy1', version: null },
  { policyId: 'policy#1', kind: 'base', baseId: 'policy#1', version: null },
  { policyId: 'policy1#', kind: 'base', baseId: 'policy1#', version: null },
  { policyId: 'policy1#9', kind: 'base', baseId: 'policy1#9', version: null },
  { policyId: 'policy1#9.', kind: 'base', baseId: 'policy1#9.', version: null },
  { policyId: 'policy1#.4', kind: 'base', baseId: 'policy1#.4', version: null },
  { policyId: 'policy1#9.4.1', kind: 'base', baseId: 'policy1#9.4.1', version: null },
  { policyId: 'policy1#9.x', kind: 'base', baseId: 'policy1#9.x', version: null },
  { policyId: 'policy1#9.4#extra', kind: 'base', baseId: 'policy1#9.4#extra', version: null },
  { policyId: 'policy1#9.4', kind: 'agentVersion', baseId: 'policy1', version: '9.4' },
  { policyId: 'policy1#10.12', kind: 'agentVersion', baseId: 'policy1', version: '10.12' },
  { policyId: 'policy#1#9.4', kind: 'agentVersion', baseId: 'policy#1', version: '9.4' },
  { policyId: 'policy1#sentinel', kind: 'sentinel', baseId: 'policy1', version: 'sentinel' },
  { policyId: 'policy#1#sentinel', kind: 'sentinel', baseId: 'policy#1', version: 'sentinel' },
  { policyId: 'policy1#sentinelx', kind: 'base', baseId: 'policy1#sentinelx', version: null },
  { policyId: 'policy1#Sentinel', kind: 'base', baseId: 'policy1#Sentinel', version: null },
  {
    policyId: 'policy1#sentinel#extra',
    kind: 'base',
    baseId: 'policy1#sentinel#extra',
    version: null,
  },
  {
    policyId: 'policy1#9.4#sentinel',
    kind: 'sentinel',
    baseId: 'policy1#9.4',
    version: 'sentinel',
  },
];
