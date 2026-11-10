/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent } from '../../common/types';
import { AgentHealth } from '../applications/fleet/sections/agents/components/agent_health';

export interface AgentStatusBadgeProps {
  /** The agent whose status to show. Without one, a Pending badge stands in until it enrolls. */
  agent?: Agent;
  /** Makes the badge a button, to open the status flyout. */
  onClick?: () => void;
  /** Shown in the check-in tooltip of the agent badge, after the check-in details. */
  tooltipExtraContent?: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Status of the agent behind a managed integration or a deployed service: the agent's health
 * badge, or Pending while there is no agent yet. Shared by the Managed integrations table and the
 * onboarding flow so both show it the same way.
 */
export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  agent,
  onClick,
  tooltipExtraContent,
  'data-test-subj': dataTestSubj,
}) => {
  const pendingLabel = (
    <FormattedMessage
      id="xpack.fleet.packageDetails.integrationList.pendingAgentlessStatus"
      defaultMessage="Pending"
    />
  );

  if (onClick) {
    const onClickAriaLabel = i18n.translate(
      'xpack.fleet.epm.packageDetails.integrationList.agentlessStatusAriaLabel',
      {
        defaultMessage: 'Open status details',
      }
    );
    return agent ? (
      <AgentHealth
        agent={agent}
        tooltipExtraContent={tooltipExtraContent}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
        data-test-subj={dataTestSubj}
      />
    ) : (
      <EuiBadge
        color="default"
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
        data-test-subj={dataTestSubj}
      >
        {pendingLabel}
      </EuiBadge>
    );
  }

  return agent ? (
    <AgentHealth
      agent={agent}
      tooltipExtraContent={tooltipExtraContent}
      data-test-subj={dataTestSubj}
    />
  ) : (
    <EuiBadge color="default" data-test-subj={dataTestSubj}>
      {pendingLabel}
    </EuiBadge>
  );
};
