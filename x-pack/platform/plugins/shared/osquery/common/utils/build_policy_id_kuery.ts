/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

// Matches both a base Fleet agent policy id and its version-specific
// variants (`<policyId>#<major.minor>`), which Fleet assigns when the policy
// has an integration with an agent-version condition. Without the wildcard,
// those agents are silently excluded from selection and dispatch.
export const buildPolicyIdKuery = (policyIds: string[]): string => {
  const ids = uniq(policyIds);

  if (!ids.length) {
    return 'policy_id:()'; // matches nothing, valid KQL
  }

  const fragments = ids.flatMap((id) => [`policy_id:${id}`, `policy_id:${id}#*`]);

  return `(${fragments.join(' or ')})`;
};
