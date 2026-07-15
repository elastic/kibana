/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiPopover } from '@elastic/eui';

import { PERMISSION_STATUS_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type {
  PackagePolicyPermissionSummary,
  VerificationStatus,
} from '../../../common/types/models/cloud_connector';

import { PermissionStateBadge } from './permission_state_badge';
import { PermissionStatusPopover } from './permission_status_popover';
import { getPermissionStateFromSummary } from './get_permission_state';

interface PermissionStatusCellProps {
  packagePolicyId: string;
  integrationName: string;
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined;
  verificationStatus: VerificationStatus | undefined;
}

export const PermissionStatusCell: React.FC<PermissionStatusCellProps> = ({
  packagePolicyId,
  integrationName,
  verificationPermissions,
  verificationStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const summary = useMemo(
    () => verificationPermissions?.find((entry) => entry.package_policy_id === packagePolicyId),
    [packagePolicyId, verificationPermissions]
  );

  const cellState = useMemo(
    () => getPermissionStateFromSummary(summary, verificationStatus),
    [summary, verificationStatus]
  );

  const togglePopover = useCallback(() => setIsOpen((v) => !v), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="none"
      data-test-subj={`${PERMISSION_STATUS_TEST_SUBJECTS.CELL}-${packagePolicyId}`}
      button={<PermissionStateBadge state={cellState} onClick={togglePopover} isClickable />}
    >
      <PermissionStatusPopover
        cellState={cellState}
        summary={summary}
        integrationName={integrationName}
      />
    </EuiPopover>
  );
};
