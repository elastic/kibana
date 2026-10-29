/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../../../../common/types';
import { AgentlessStatusDetailsFlyout } from '../../../../../../../components';

interface InstanceAgentFlyoutProps {
  agent: Agent;
  /** The agent policy the agent is enrolled in, without a version suffix. */
  agentPolicyId: string;
  packagePolicy: PackagePolicy;
  onClose: () => void;
}

/**
 * The status details of an instance agent, with the health of each of its components, as the AWS
 * onboarding flow opens them for an agent that is there. The same for managed integration
 * (agentless) and agent-based agents.
 */
export const InstanceAgentFlyout: React.FunctionComponent<InstanceAgentFlyoutProps> = ({
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
