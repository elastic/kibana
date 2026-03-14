/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AgentVisibility,
  VISIBILITY_ICON,
  VISIBILITY_BADGE_COLOR,
  type AgentDefinition,
} from '@kbn/agent-builder-common';
import React from 'react';
import { VISIBILITY_LABELS, VISIBILITY_TOOLTIPS } from '../../../utils/visibility_i18n';

export interface AgentVisibilityBadgeProps {
  agent: AgentDefinition;
}

export const AgentVisibilityBadge: React.FC<AgentVisibilityBadgeProps> = ({ agent }) => {
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

  const visibility = agent.visibility ?? AgentVisibility.Public;

  return (
    <EuiToolTip content={VISIBILITY_TOOLTIPS[visibility]}>
      <EuiBadge
        tabIndex={0}
        iconType={VISIBILITY_ICON[visibility]}
        color={VISIBILITY_BADGE_COLOR[visibility]}
        data-test-subj={`agentBuilderAgentsListVisibility-${visibility}`}
      >
        {VISIBILITY_LABELS[visibility]}
      </EuiBadge>
    </EuiToolTip>
  );
};
