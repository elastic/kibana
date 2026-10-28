/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Agent } from '../../../../../../../../common/types';
import { AgentStatusBadge } from '../../../../../../../components';
import type { InstanceAgent } from '../hooks/use_instances_agents';

// Lower first: the badge shows the agent that most needs attention.
const STATUS_ORDER: Partial<Record<Agent['status'] & string, number>> = {
  error: 0,
  degraded: 0,
  offline: 1,
  updating: 2,
  enrolling: 2,
  unenrolling: 2,
  online: 3,
};
const statusRank = (agent: Agent) => (agent.status && STATUS_ORDER[agent.status]) ?? 4;

/**
 * The status badge of one agent, the one that most needs attention, followed by a count of the
 * other agents. The badge opens the agent status flyout when the agent's package policy is known.
 */
export const InstanceStatusCell: React.FunctionComponent<{
  agents: InstanceAgent[];
  onOpen: (instanceAgent: InstanceAgent) => void;
}> = ({ agents, onOpen }) => {
  if (agents.length === 0) return <>-</>;

  const [shown, ...others] = [...agents].sort((a, b) => statusRank(a.agent) - statusRank(b.agent));
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <AgentStatusBadge
          agent={shown.agent}
          onClick={shown.packagePolicy ? () => onOpen(shown) : undefined}
          data-test-subj="instanceAgentStatus"
        />
      </EuiFlexItem>
      {others.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.instances.status.moreTooltip',
              {
                defaultMessage:
                  '{count, plural, one {# more agent} other {# more agents}}. See the Agents column for all of them.',
                values: { count: others.length },
              }
            )}
          >
            <EuiText size="xs" tabIndex={0} data-test-subj="instanceAgentStatusMore">
              {i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.status.more', {
                defaultMessage: '+{count}',
                values: { count: others.length },
              })}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
