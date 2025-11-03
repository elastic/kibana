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
}: {
  status: FieldStatus;
  uncommitted?: boolean;
}) => {
  // Show pending badge if uncommitted, otherwise show regular status badge
  if (uncommitted) {
    return (
      <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={FIELD_STATUS_MAP[status].tooltip}>
            <EuiBadge tabIndex={0} color={FIELD_STATUS_MAP[status].color}>
              {FIELD_STATUS_MAP[status].label}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={FIELD_STATUS_MAP.pending.tooltip}>
            <EuiBadge tabIndex={0} color={FIELD_STATUS_MAP.pending.color}>
              <EuiIcon type="clockCounter" size="s" />
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiToolTip content={FIELD_STATUS_MAP[status].tooltip}>
      <EuiBadge tabIndex={0} color={FIELD_STATUS_MAP[status].color}>
        {FIELD_STATUS_MAP[status].label}
      </EuiBadge>
    </EuiToolTip>
  );
};
