/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AgentAccessControlScope,
  ACCESS_CONTROL_SCOPE_ICON,
  ACCESS_CONTROL_SCOPE_BADGE_COLOR,
  type AgentDefinition,
} from '@kbn/agent-builder-common';
import React from 'react';
import {
  ACCESS_CONTROL_SCOPE_LABELS,
  ACCESS_CONTROL_SCOPE_TOOLTIPS,
} from '../../../utils/access_control_scope_i18n';
import { accessFlyoutCustomBadge, accessFlyoutCustomBadgeWithCount } from '../access/access_i18n';

export interface AgentAccessControlScopeBadgeProps {
  agent: AgentDefinition;
}

const accessControlEntryCount = (agent: AgentDefinition): number =>
  agent.access_control?.entries?.length ?? 0;

export const AgentAccessControlScopeBadge: React.FC<AgentAccessControlScopeBadgeProps> = ({
  agent,
}) => {
  if (agent.readonly) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.agentBuilder.agents.accessControlScope.readOnlyTooltip', {
          defaultMessage: 'Built-in agents are read-only.',
        })}
      >
        <EuiBadge
          tabIndex={0}
          color="accent"
          data-test-subj="agentBuilderAgentsListAccessControlScopeBuiltInBadge"
        >
          {i18n.translate('xpack.agentBuilder.agents.accessControlScope.builtIn', {
            defaultMessage: 'Read-only',
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const accessControlScope = agent.access_control?.scope ?? AgentAccessControlScope.Public;
  const accessControlCount = accessControlEntryCount(agent);
  const tooltip =
    accessControlCount > 0
      ? `${ACCESS_CONTROL_SCOPE_TOOLTIPS[accessControlScope]} ${accessFlyoutCustomBadgeWithCount(
          accessControlCount
        )}`
      : ACCESS_CONTROL_SCOPE_TOOLTIPS[accessControlScope];

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltip}>
          <EuiBadge
            tabIndex={0}
            iconType={ACCESS_CONTROL_SCOPE_ICON[accessControlScope]}
            color={ACCESS_CONTROL_SCOPE_BADGE_COLOR[accessControlScope]}
            data-test-subj={`agentBuilderAgentsListAccessControlScope-${accessControlScope}`}
          >
            {ACCESS_CONTROL_SCOPE_LABELS[accessControlScope]}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
      {accessControlCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={accessFlyoutCustomBadge}>
            <EuiBadge
              tabIndex={0}
              color="hollow"
              iconType="users"
              data-test-subj="agentBuilderAgentsListCustomAccess"
            >
              +{accessControlCount}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
