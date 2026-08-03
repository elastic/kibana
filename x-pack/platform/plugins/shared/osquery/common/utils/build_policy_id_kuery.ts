/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { escapeKuery, escapeQuotes } from '@kbn/es-query';

// Matches both a base Fleet agent policy id and its version-specific
// variants (`<policyId>#<major.minor>`), which Fleet assigns when the policy
// has an integration with an agent-version condition. Without the wildcard,
// those agents are silently excluded from selection and dispatch.
// Values are escaped per Fleet's getPolicyOrVersionSpecificKuery; the shared
// `policy_id:(...)` prefix keeps the kuery compact since it can travel in a
// GET query string.
export const buildPolicyIdKuery = (policyIds: string[]): string => {
  const ids = uniq(policyIds);

  if (!ids.length) {
    return 'policy_id:("")'; // parseable KQL that matches nothing
  }

  const values = ids.flatMap((id) => [`"${escapeQuotes(id)}"`, `${escapeKuery(id)}#*`]);

  return `policy_id:(${values.join(' or ')})`;
};
