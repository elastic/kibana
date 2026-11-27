/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { Actor, InvestigationStatus } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import * as i18n from './translations';

export type DisplayStatus = 'needs_owner' | 'in_progress' | 'closed';

/** An open investigation without an owner is shown as "Needs owner". */
export const getDisplayStatus = (
  status: InvestigationStatus,
  owner: Actor | null | undefined
): DisplayStatus => {
  if (status === 'closed') {
    return 'closed';
  }
  if (status === 'open' && !owner) {
    return 'needs_owner';
  }
  return 'in_progress';
};

export const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  needs_owner: i18n.STATUS_NEEDS_OWNER,
  in_progress: i18n.STATUS_IN_PROGRESS,
  closed: i18n.STATUS_CLOSED,
};

const STATUS_COLORS = {
  needs_owner: 'warning',
  in_progress: 'success',
  closed: 'hollow',
} as const;

export interface StatusBadgeProps {
  status: InvestigationStatus;
  owner: Actor | null | undefined;
  /** The label of the configured status; defaults to the label of the display status. */
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, owner, label }) => {
  const displayStatus = getDisplayStatus(status, owner);

  return (
    <EuiBadge
      color={STATUS_COLORS[displayStatus]}
      iconType={ICONS.graphNode}
      data-test-subj={`investigationStatusBadge-${displayStatus}`}
    >
      {label ?? DISPLAY_STATUS_LABELS[displayStatus]}
    </EuiBadge>
  );
};
StatusBadge.displayName = 'StatusBadge';
