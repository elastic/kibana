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
import { VISIBILITY_LABELS, VISIBILITY_TOOLTIPS } from '../../../utils/visibility_i18n';
import { accessFlyoutCustomBadge, accessFlyoutCustomBadgeWithCount } from '../access/access_i18n';

export interface AgentAccessControlScopeBadgeProps {
  agent: AgentDefinition;
}

const accessControlEntryCount = (agent: AgentDefinition): number =>
  agent.accessControl?.entries?.length ?? 0;

export const AgentAccessControlScopeBadge: React.FC<AgentAccessControlScopeBadgeProps> = ({
  agent,
}) => {
  if (agent.readonly) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.agentBuilder.agents.visibility.readOnlyTooltip', {
          defaultMessage: 'Built-in agents are read-only.',
        })}
      >
        <EuiBadge
          tabIndex={0}
          color="accent"
          data-test-subj="agentBuilderAgentsListVisibilityBuiltInBadge"
        >
          {i18n.translate('xpack.agentBuilder.agents.visibility.builtIn', {
            defaultMessage: 'Read-only',
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const visibility = agent.accessControl?.scope ?? AgentAccessControlScope.Public;
  const accessControlCount = accessControlEntryCount(agent);
  const tooltip =
    accessControlCount > 0
      ? `${VISIBILITY_TOOLTIPS[visibility]} ${accessFlyoutCustomBadgeWithCount(accessControlCount)}`
      : VISIBILITY_TOOLTIPS[visibility];

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltip}>
          <EuiBadge
            tabIndex={0}
            iconType={ACCESS_CONTROL_SCOPE_ICON[visibility]}
            color={ACCESS_CONTROL_SCOPE_BADGE_COLOR[visibility]}
            data-test-subj={`agentBuilderAgentsListVisibility-${visibility}`}
          >
            {VISIBILITY_LABELS[visibility]}
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
