/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { normalizeKiLifecycleStatus } from '../../../utils/ki_display';
import { kiLabelCapitalizeCss } from './ki_type_display';

interface KiLifecycleStatusBadgeProps {
  lifecycleStatus?: KiLifecycleStatus;
  'data-test-subj'?: string;
}

export const KiLifecycleStatusBadge = ({
  lifecycleStatus,
  'data-test-subj': dataTestSubj = 'contextKiRowLifecycleStatus',
}: KiLifecycleStatusBadgeProps) => {
  const status = normalizeKiLifecycleStatus(lifecycleStatus);

  return (
    <EuiBadge
      color={status === 'deleted' ? 'danger' : 'success'}
      data-test-subj={dataTestSubj}
      css={kiLabelCapitalizeCss}
    >
      {status}
    </EuiBadge>
  );
};
