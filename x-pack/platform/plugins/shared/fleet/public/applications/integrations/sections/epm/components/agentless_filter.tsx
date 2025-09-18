/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch, EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface AgentlessFilterProps {
  agentlessFilter: boolean;
  onAgentlessFilterChange: (enabled: boolean) => void;
}

export const AgentlessFilter: React.FC<AgentlessFilterProps> = ({
  agentlessFilter,
  onAgentlessFilterChange,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={i18n.translate('xpack.fleet.epm.agentlessFilter.label', {
            defaultMessage: 'Only agentless integrations',
          })}
          checked={agentlessFilter}
          onChange={(e) => onAgentlessFilterChange(e.target.checked)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={
            <FormattedMessage
              id="xpack.fleet.epm.agentlessFilter.tooltip"
              defaultMessage="Agentless integrations run in Elastic Cloud without requiring you to deploy Elastic Agents"
            />
          }
          position="right"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
