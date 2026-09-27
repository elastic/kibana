/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiLoadingSpinner, type EuiBadgeProps, type IconType } from '@elastic/eui';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

export interface ProposedActionStatusBadgeProps {
  color?: EuiBadgeProps['color'];
  iconType?: IconType;
  label?: string;
  /** Swaps the icon for a spinner, for a decision that is still being submitted. */
  isLoading?: boolean;
}

export const ProposedActionStatusBadge = ({
  color = 'primary',
  iconType = 'clock',
  label = APPROVAL_MODAL_TRANSLATIONS.needsReviewBadge,
  isLoading = false,
}: ProposedActionStatusBadgeProps) => (
  <EuiBadge color={color} iconType={isLoading ? undefined : iconType}>
    {isLoading && <EuiLoadingSpinner size="s" style={{ marginRight: 4 }} />}
    {label}
  </EuiBadge>
);
