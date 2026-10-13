/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { KI_STATUS_BADGE_COLOR, resolveKiStatus } from '../../../../../common/ki_expiry';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { kiLabelCapitalizeCss } from './ki_type_display';

interface KiLifecycleStatusBadgeProps {
  lifecycleStatus?: KiLifecycleStatus;
  expiresAt?: string;
  'data-test-subj'?: string;
}

export const KiLifecycleStatusBadge = ({
  lifecycleStatus,
  expiresAt,
  'data-test-subj': dataTestSubj = 'contextKiRowLifecycleStatus',
}: KiLifecycleStatusBadgeProps) => {
  const status = resolveKiStatus(lifecycleStatus, expiresAt);

  return (
    <EuiBadge
      color={KI_STATUS_BADGE_COLOR[status]}
      data-test-subj={dataTestSubj}
      css={kiLabelCapitalizeCss}
    >
      {status}
    </EuiBadge>
  );
};
