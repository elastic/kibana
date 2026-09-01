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
import { useKibana } from '../../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

interface PackagePolicy {
  id: string;
  policy_ids: string[];
}

interface PackagePoliciesResponse {
  items: PackagePolicy[];
}

interface TargetingWarningCalloutProps {
  policyIds: string[];
}

const TargetingWarningCalloutComponent: React.FC<TargetingWarningCalloutProps> = ({
  policyIds,
}) => {
  const { http } = useKibana().services;

  const { data: packagePoliciesData } = useQuery<PackagePoliciesResponse>(
    ['osquery-package-policies-for-targeting-check'],
    () =>
      http.get('/api/fleet/package_policies', {
        query: {
          kuery: `package_policies.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
        },
      }),
    {
      staleTime: 30_000,
    }
  );

  const untargetedPolicyIds = useMemo(() => {
    if (!policyIds.length || !packagePoliciesData?.items) return [];

    const targetSet = new Set(policyIds);
    const untargeted = new Set<string>();

    for (const pp of packagePoliciesData.items) {
      const ppPolicyIds = pp.policy_ids ?? [];
      // Check if this package policy covers at least one targeted agent policy
      const coversTarget = ppPolicyIds.some((id) => targetSet.has(id));
      if (!coversTarget) continue;

      // Check if it also covers agent policies outside the target set
      for (const id of ppPolicyIds) {
        if (!targetSet.has(id)) {
          untargeted.add(id);
        }
      }
    }

    return [...untargeted];
  }, [packagePoliciesData, policyIds]);

  // Fetch names for the untargeted agent policies
  const { data: agentPoliciesData } = useQuery<{ items: Array<{ id: string; name: string }> }>(
    ['osquery-agent-policies-for-targeting-warning', untargetedPolicyIds],
    () =>
      http.get('/api/fleet/agent_policies', {
        query: {
          kuery: untargetedPolicyIds.map((id) => `agent_policies.id:"${id}"`).join(' or '),
          perPage: 1000,
        },
      }),
    {
      enabled: untargetedPolicyIds.length > 0,
      staleTime: 30_000,
    }
  );

  const untargetedNames = useMemo(() => {
    if (!agentPoliciesData?.items) return [];

    return agentPoliciesData.items.map((ap) => ap.name).filter(Boolean);
  }, [agentPoliciesData]);

  const messageValues = useMemo(
    () => ({ count: untargetedNames.length, names: untargetedNames.join(', ') }),
    [untargetedNames]
  );

  if (!untargetedNames.length) return null;

  return (
    <>
      {/* aria-live region so assistive technology announces this as a status message */}
      <div role="status" aria-live="polite" aria-atomic="true">
        <EuiCallOut
          title={i18n.translate('xpack.osquery.pack.form.targetingWarning.title', {
            defaultMessage: 'Pack may reach additional agent policies',
          })}
          color="warning"
          iconType="warning"
          data-test-subj="packTargetingWarningCallout"
        >
          <FormattedMessage
            id="xpack.osquery.pack.form.targetingWarning.body"
            defaultMessage="The Osquery Manager integration is shared with the following agent {count, plural, one {policy} other {policies}} that are not in this pack's target set. Because the integration is shared, this pack will also be delivered to those {count, plural, one {policy} other {policies}}: {names}"
            values={messageValues}
          />
        </EuiCallOut>
      </div>
      <EuiSpacer size="m" />
    </>
  );
};

export const TargetingWarningCallout = React.memo(TargetingWarningCalloutComponent);
