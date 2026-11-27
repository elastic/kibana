/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { InvestigationPriority } from '../../../../common/investigations/types';
import * as i18n from './translations';

const PRIORITY_COLORS = {
  critical: 'danger',
  high: 'risk',
  medium: 'warning',
  low: 'hollow',
} as const;

export interface PriorityBadgeProps {
  priority: InvestigationPriority;
  /** The reason for the priority, shown as a tooltip. */
  note?: string | null;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, note }) => {
  const badge = (
    <EuiBadge
      color={PRIORITY_COLORS[priority]}
      data-test-subj={`investigationPriorityBadge-${priority}`}
    >
      {i18n.PRIORITY_LABELS[priority]}
    </EuiBadge>
  );

  return note ? <EuiToolTip content={note}>{badge}</EuiToolTip> : badge;
};
PriorityBadge.displayName = 'PriorityBadge';
