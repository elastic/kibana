/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';

export type OsqueryAgentPolicy = GetAgentPoliciesResponseItem & {
  package_policy_id?: string;
  package_policy_name?: string;
  osquery_package_policies?: Array<{ id: string; name: string }>;
};
