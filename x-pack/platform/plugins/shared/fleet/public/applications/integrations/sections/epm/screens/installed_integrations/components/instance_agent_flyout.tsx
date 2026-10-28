/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { PackagePolicy } from '../../../../../../../../common/types';
import {
  AgentEnrollmentFlyout,
  AgentlessEnrollmentFlyout,
  Loading,
} from '../../../../../../../components';
import { useBulkGetAgentPoliciesQuery } from '../../../../../../../hooks';
import {
  getConnectorsFromPackagePolicy,
  getSelectedInput,
} from '../../detail/policies/components/agentless_table_adapters';

interface InstanceAgentFlyoutProps {
  /** The agent policy the agent is enrolled in, without a version suffix. */
  agentPolicyId: string;
  packagePolicy: PackagePolicy;
  onClose: () => void;
}

/**
 * The status flyout of an instance agent, as the integration policies tables open it: the
 * agentless one for a managed integration policy, the agent enrollment one for an agent-based
 * policy.
 */
export const InstanceAgentFlyout: React.FunctionComponent<InstanceAgentFlyoutProps> = (props) =>
  props.packagePolicy.supports_agentless ? (
    <AgentlessStatusFlyout {...props} />
  ) : (
    <AgentBasedStatusFlyout {...props} />
  );

const AgentlessStatusFlyout: React.FunctionComponent<InstanceAgentFlyoutProps> = ({
  agentPolicyId,
  packagePolicy,
  onClose,
}) => (
  <AgentlessEnrollmentFlyout
    onClose={onClose}
    policyId={agentPolicyId}
    policyName={packagePolicy.name}
    // package is always set for agentless policies (createAgentlessPolicy).
    packageInfo={{ name: packagePolicy.package!.name, version: packagePolicy.package!.version }}
    selectedInput={getSelectedInput(packagePolicy)}
    packagePolicy={packagePolicy}
    connectors={getConnectorsFromPackagePolicy(packagePolicy)}
  />
);

const AgentBasedStatusFlyout: React.FunctionComponent<InstanceAgentFlyoutProps> = ({
  agentPolicyId,
  packagePolicy,
  onClose,
}) => {
  // The enrollment flyout needs the full agent policy, which the instances list does not carry.
  const { data, isLoading } = useBulkGetAgentPoliciesQuery([agentPolicyId], {
    ignoreMissing: true,
  });
  if (isLoading) return <Loading />;

  const agentPolicy = data?.items?.[0];
  return (
    <AgentEnrollmentFlyout
      onClose={onClose}
      agentPolicy={agentPolicy}
      selectedAgentPolicies={agentPolicy ? [agentPolicy] : undefined}
      isIntegrationFlow={true}
      installedPackagePolicy={{
        name: packagePolicy.package?.name || '',
        version: packagePolicy.package?.version || '',
      }}
    />
  );
};
