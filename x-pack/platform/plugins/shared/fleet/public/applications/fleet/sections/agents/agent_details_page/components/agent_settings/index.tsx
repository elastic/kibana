/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';
import { SelectLogLevel } from '../agent_logs/select_log_level';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../../types';
interface AgentSettingsProps {
  agent: Agent;
  agentPolicy: AgentPolicy | undefined;
}
// Allows child text to be truncated

export const AgentSettings: React.FunctionComponent<AgentSettingsProps> = ({
  agent,
  agentPolicy,
}) => {
  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem>
        <EuiPanel grow={false}>
          <EuiTitle size="s">
            <p>
              <FormattedMessage
                id="xpack.fleet.agentDetails.settingsSectionTitle"
                defaultMessage="Log Level Setting"
              />
            </p>
          </EuiTitle>
          <EuiSpacer size="m" />
          <SelectLogLevel
            agent={agent}
            agentPolicyLogLevel={agentPolicy?.advanced_settings?.agent_logging_level}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
