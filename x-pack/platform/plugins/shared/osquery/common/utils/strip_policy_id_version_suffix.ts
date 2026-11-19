/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeVersionSuffixFromPolicyId } from '@kbn/fleet-plugin/common';

// Strips the suffix that Fleet adds to the policy id of an agent: `#<major>.<minor>` for a version
// specific policy and `#sentinel` for the sentinel policy version. A custom policy id may legitimately
// contain a non-version "#" (e.g. `policy#123`), which is left alone.
export const stripPolicyIdVersionSuffix = (policyId: string): string =>
  removeVersionSuffixFromPolicyId(policyId);
