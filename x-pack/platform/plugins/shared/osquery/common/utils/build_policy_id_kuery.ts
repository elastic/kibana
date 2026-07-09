/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

/**
 * Builds a `policy_id` kuery fragment that matches both the base Fleet agent
 * policy id and its version-specific variants (`<policyId>#<major.minor>`),
 * e.g. `<policyId>#9.4`.
 *
 * Fleet may assign agents to a version-specific policy id when the agent
 * policy contains an integration with an agent-version condition (Fleet's
 * `AGENT_POLICY_VERSION_SEPARATOR`, currently `#`). That constant is not part
 * of `@kbn/fleet-plugin`'s public `common` entry point, so it is duplicated
 * here as a literal rather than deep-imported. Without the wildcard, agents
 * on a version-specific variant are silently excluded from selection and
 * dispatch.
 */
export const buildPolicyIdKuery = (policyIds: string[]): string => {
  const ids = uniq(policyIds);

  if (!ids.length) {
    // Preserves the pre-existing "match nothing" shape when there are no
    // policy ids to filter on (e.g. no Osquery integration installed).
    return 'policy_id:()';
  }

  const fragments = ids.flatMap((id) => [`policy_id:${id}`, `policy_id:${id}#*`]);

  return `(${fragments.join(' or ')})`;
};
