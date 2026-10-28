/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../../../../common/types';
import {
  AgentlessEnrollmentFlyout,
  AgentlessStatusDetailsFlyout,
} from '../../../../../../../components';
import {
  getConnectorsFromPackagePolicy,
  getSelectedInput,
} from '../../detail/policies/components/agentless_table_adapters';

interface InstanceAgentFlyoutProps {
  agent: Agent;
  /** The agent policy the agent is enrolled in, without a version suffix. */
  agentPolicyId: string;
  packagePolicy: PackagePolicy;
  onClose: () => void;
}

/**
 * The status flyout of an instance agent: the agentless enrollment status for a managed
 * integration policy, as the managed integrations table opens it, and the component health of the
 * agent for an agent-based policy, as the AWS onboarding flow opens it.
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
  agent,
  agentPolicyId,
  packagePolicy,
  onClose,
}) => (
  <AgentlessStatusDetailsFlyout
    onClose={onClose}
    policyName={packagePolicy.package?.title ?? packagePolicy.name}
    agent={agent}
    // Only the id is used, for the agent policy link.
    agentPolicy={{ id: agentPolicyId } as AgentPolicy}
    packagePolicy={packagePolicy}
  />
);
