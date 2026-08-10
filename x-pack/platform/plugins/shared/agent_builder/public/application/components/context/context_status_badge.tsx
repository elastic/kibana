/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { ContextStatus } from '../../hooks/ai_indices/context_status';
import { labels } from '../../utils/i18n';

interface ContextStatusBadgeProps {
  status: ContextStatus;
}

const badgeProps: Record<ContextStatus, { color: string; label: string; tooltip: string }> = {
  on: {
    color: 'success',
    label: labels.context.badgeOn,
    tooltip: labels.context.badgeOnTooltip,
  },
  auto: {
    color: 'accent',
    label: labels.context.badgeAuto,
    tooltip: labels.context.badgeAutoTooltip,
  },
  off: {
    color: 'hollow',
    label: labels.context.badgeOff,
    tooltip: labels.context.badgeOffTooltip,
  },
};

export const ContextStatusBadge: React.FC<ContextStatusBadgeProps> = ({ status }) => {
  const { color, label, tooltip } = badgeProps[status];

  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge
        color={color}
        tabIndex={0}
        data-test-subj={`agentBuilderContextStatusBadge-${status}`}
      >
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
