/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SelectLogLevel } from '../agent_logs/select_log_level';

import type { Agent, AgentPolicy } from '../../../../../types';
interface AgentSettingsProps {
  agent: Agent;
  agentPolicy: AgentPolicy | undefined;
}

export const AgentSettings: React.FunctionComponent<AgentSettingsProps> = ({
  agent,
  agentPolicy,
}) => {
  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem>
        <SelectLogLevel
          agent={agent}
          agentPolicyLogLevel={agentPolicy?.advanced_settings?.agent_logging_level}
          // agentless agents are managed by Elastic: their log level can't be changed
          isReadOnly={agentPolicy?.supports_agentless === true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
