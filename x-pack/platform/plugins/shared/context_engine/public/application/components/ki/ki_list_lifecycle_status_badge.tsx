/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import type { KiLifecycleStatus } from '../../../../common/step_types/ki';
import { getKiLifecycleStatusLabel, normalizeKiLifecycleStatus } from './helpers';

interface KiListLifecycleStatusBadgeProps {
  lifecycleStatus?: KiLifecycleStatus;
}

export const KiListLifecycleStatusBadge = ({
  lifecycleStatus,
}: KiListLifecycleStatusBadgeProps) => {
  const status = normalizeKiLifecycleStatus(lifecycleStatus);

  return (
    <EuiBadge
      color={status === 'deleted' ? 'danger' : 'success'}
      data-test-subj="contextKiRowLifecycleStatus"
    >
      {getKiLifecycleStatusLabel(status)}
    </EuiBadge>
  );
};
