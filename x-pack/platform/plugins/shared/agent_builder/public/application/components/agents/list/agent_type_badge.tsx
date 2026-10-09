/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import React from 'react';

// A non-default (non-chat) agent type contributes a managed base configuration,
// merged under the agent's own config at resolution time.
export const isPreconfiguredAgentType = (agentType: string | undefined): boolean =>
  agentType !== undefined && agentType !== chatAgentTypeId;

export interface AgentTypeBadgeProps {
  agentType: string | undefined;
}

export const AgentTypeBadge: React.FC<AgentTypeBadgeProps> = ({ agentType }) => {
  if (!isPreconfiguredAgentType(agentType)) {
    return null;
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.agentBuilder.agents.preconfiguredType.tooltip', {
        defaultMessage:
          'This agent is based on a preconfigured type, which provides part of its configuration.',
      })}
    >
      <EuiBadge
        tabIndex={0}
        color="hollow"
        data-test-subj="agentBuilderAgentPreconfiguredTypeBadge"
      >
        {i18n.translate('xpack.agentBuilder.agents.preconfiguredType.badge', {
          defaultMessage: 'Preconfigured',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};
