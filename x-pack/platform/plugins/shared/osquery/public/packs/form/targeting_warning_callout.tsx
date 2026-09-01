/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { API_VERSIONS, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

interface PackagePolicy {
  id: string;
  policy_ids?: string[];
}

interface PackagePoliciesResponse {
  items: PackagePolicy[];
}

interface AgentPoliciesResponse {
  items: Array<{ id: string; name: string }>;
}

interface TargetingWarningCalloutProps {
  policyIds: string[];
}

// Fleet's package-policy list is offset-paginated. Osquery Manager is a limited
// package (one policy per agent policy), so this is bounded by the number of
// agent policies; 1000 matches the plugin-wide convention for these lookups.
const FLEET_LOOKUP_PER_PAGE = 1000;

/**
 * Warns that a pack targeted at specific agent policies will ALSO reach agent
 * policies it does not target, because the Osquery Manager integration is
 * shared across them.
 *
 * This over-delivery cannot be prevented from Kibana: `osquery_manager` declares
 * `multiple: false`, so Fleet allows only one osquery package policy per agent
 * policy and a narrower "targeted" policy cannot be created. Fleet also compiles
 * a shared package policy identically into every agent policy that references
 * it, so there is no per-agent-policy dimension in the pack block to filter on.
 * The remedy is for the user to give each agent policy its own Osquery Manager
 * integration policy in Fleet. See https://github.com/elastic/kibana/issues/285994.
 *
 * The equivalent server-side check returns `targeting_warning` on the create and
 * update responses; this component exists to surface the same fact BEFORE the
 * user saves.
 */
const TargetingWarningCalloutComponent: React.FC<TargetingWarningCalloutProps> = ({
  policyIds,
}) => {
  const { http } = useKibana().services;

  const { data: packagePoliciesData } = useQuery<PackagePoliciesResponse>(
    ['osquery-package-policies-for-targeting-check'],
    () =>
      http.get('/api/fleet/package_policies', {
        // Public versioned route: without an explicit version it 400s in
        // production (dev mode masks this by falling back to the latest).
        version: API_VERSIONS.public.v1,
        query: {
          // Prefix is the saved-object type, not `package_policies.` (Fleet
          // rejects an unknown type with a 400) and without `.attributes.`
          // (this endpoint rejects that path as a non-existent key).
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${OSQUERY_INTEGRATION_NAME}"`,
          perPage: FLEET_LOOKUP_PER_PAGE,
        },
      }),
    {
      staleTime: 30_000,
      enabled: policyIds.length > 0,
    }
  );

  const untargetedPolicyIds = useMemo(() => {
    if (!policyIds.length || !packagePoliciesData?.items) return [];

    const targetSet = new Set(policyIds);
    const untargeted = new Set<string>();

    for (const packagePolicy of packagePoliciesData.items) {
      const packagePolicyIds = packagePolicy.policy_ids ?? [];
      // Only package policies this pack actually writes to can over-deliver.
      if (!packagePolicyIds.some((id) => targetSet.has(id))) continue;

      for (const id of packagePolicyIds) {
        if (!targetSet.has(id)) {
          untargeted.add(id);
        }
      }
    }

    return [...untargeted];
  }, [packagePoliciesData, policyIds]);

  // `useQuery` keys must be stable: a fresh array each render would refetch on
  // every keystroke elsewhere in the form.
  const untargetedIdsKey = useMemo(
    () => [...untargetedPolicyIds].sort().join(','),
    [untargetedPolicyIds]
  );

  // `_bulk_get` rather than a `kuery` on `/agent_policies`: an agent policy's id
  // is the saved-object id, which is not a queryable field on that endpoint
  // (`agent_policies.id:"<id>"` is rejected as a non-existent key, and `id:"<id>"`
  // silently matches nothing). This mirrors the server's `getByIds`, including
  // `ignoreMissing` for a policy deleted since the package-policy read.
  const { data: agentPoliciesData } = useQuery<AgentPoliciesResponse>(
    ['osquery-agent-policies-for-targeting-warning', untargetedIdsKey],
    () =>
      http.post('/api/fleet/agent_policies/_bulk_get', {
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({ ids: untargetedPolicyIds, ignoreMissing: true }),
      }),
    {
      enabled: untargetedPolicyIds.length > 0,
      staleTime: 30_000,
    }
  );

  const untargetedNames = useMemo(() => {
    if (!untargetedPolicyIds.length) return [];

    const nameById = new Map((agentPoliciesData?.items ?? []).map((ap) => [ap.id, ap.name]));

    // Fall back to the raw id for an agent policy that did not resolve: listing
    // fewer policies than actually receive the pack would understate the reach.
    return untargetedPolicyIds.map((id) => nameById.get(id) || id);
  }, [agentPoliciesData, untargetedPolicyIds]);

  const messageValues = useMemo(
    () => ({ count: untargetedNames.length, names: untargetedNames.join(', ') }),
    [untargetedNames]
  );

  if (!untargetedNames.length) return null;

  return (
    <>
      <EuiSpacer size="m" />
      {/* aria-live region so assistive technology announces this as a status message */}
      <div role="status" aria-live="polite" aria-atomic="true">
        <EuiCallOut
          title={i18n.translate('xpack.osquery.pack.form.targetingWarning.title', {
            defaultMessage: 'This pack will also run on other agent policies',
          })}
          color="warning"
          iconType="warning"
          data-test-subj="packTargetingWarningCallout"
        >
          <FormattedMessage
            id="xpack.osquery.pack.form.targetingWarning.body"
            defaultMessage="The Osquery Manager integration is shared with {count, plural, one {an agent policy} other {agent policies}} that this pack does not target, and a shared integration delivers the same configuration to every policy that uses it. This pack will therefore also run on: {names}. To limit it to the policies you selected, give each agent policy its own Osquery Manager integration policy in Fleet."
            values={messageValues}
          />
        </EuiCallOut>
      </div>
    </>
  );
};

export const TargetingWarningCallout = React.memo(TargetingWarningCalloutComponent);
