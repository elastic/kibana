/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import type { FieldStatus } from './constants';
import { FIELD_STATUS_MAP } from './constants';

export const FieldStatusBadge = ({
  status,
  uncommitted,
  streamType,
}: {
  status: FieldStatus;
  uncommitted?: boolean;
  streamType?: 'wired' | 'classic' | 'query' | 'unknown';
}) => {
  // Determine the display status - for classic streams, show "dynamic" instead of "unmapped"
  const displayStatus = status === 'unmapped' && streamType === 'classic' ? 'dynamic' : status;

  // Combine tooltip messages when uncommitted
  const tooltipContent = uncommitted
    ? `${FIELD_STATUS_MAP[displayStatus].tooltip} ${FIELD_STATUS_MAP.pending.tooltip}`
    : FIELD_STATUS_MAP[displayStatus].tooltip;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge tabIndex={0} color={FIELD_STATUS_MAP[displayStatus].color}>
        <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap={false}>
          {uncommitted && (
            <EuiFlexItem grow={false}>
              <EuiIcon type="clockCounter" size="s" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>{FIELD_STATUS_MAP[displayStatus].label}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    </EuiToolTip>
  );
};
