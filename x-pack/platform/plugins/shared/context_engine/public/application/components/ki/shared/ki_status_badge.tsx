/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import {
  KI_STATUS_BADGE_COLOR,
  KI_STATUS_LABEL,
  KI_VERIFICATION_FAILED_TITLE,
} from '../../../utils/ki_expiry';
import type { KiStatus } from '../../../../../common/ki_lifecycle_status';
import { kiLabelCapitalizeCss } from './ki_type_display';

interface KiStatusBadgeProps {
  status: KiStatus;
  'data-test-subj'?: string;
}

export const KiStatusBadge = ({
  status,
  'data-test-subj': dataTestSubj = 'contextKiRowLifecycleStatus',
}: KiStatusBadgeProps) => (
  <EuiBadge
    color={KI_STATUS_BADGE_COLOR[status]}
    data-test-subj={dataTestSubj}
    css={kiLabelCapitalizeCss}
    title={status === 'verification_failed' ? KI_VERIFICATION_FAILED_TITLE : undefined}
  >
    {KI_STATUS_LABEL[status]}
  </EuiBadge>
);
