/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps, type IconType } from '@elastic/eui';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ProposedActionStatusBadgeProps {
  color?: EuiBadgeProps['color'];
  iconType?: IconType;
  label?: string;
}

export const ProposedActionStatusBadge = ({
  color = 'primary',
  iconType = 'clock',
  label = DETAILS_FLYOUT_LABELS.proposedAction.needsReviewBadge,
}: ProposedActionStatusBadgeProps) => (
  <EuiBadge color={color} iconType={iconType}>
    {label}
  </EuiBadge>
);
