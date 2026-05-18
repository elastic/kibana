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

/**
 * Permission Status cell for the Cloud Connector flyout's integrations table.
 *
 * Renders one badge per row (state computed from `verificationPermissions` +
 * `verificationStatus`), wrapped in an `EuiPopover` that opens on click.
 *
 * Each render is `useMemo`-ed against the inputs so unrelated parent
 * re-renders don't recompute the state.
 */

interface PermissionStatusCellProps {
  /** The TARGET package policy id for this table row. */
  packagePolicyId: string;
  /** Display name of the integration (used as popover header). */
  integrationName: string;
  /** Per-target verification summaries from the cloud connector SO. */
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined;
  /** Connector-level Layer 1 status (`pending` / `success` / `failed`). */
  verificationStatus: VerificationStatus | undefined;
}

export const PermissionStatusCell: React.FC<PermissionStatusCellProps> = ({
  packagePolicyId,
  integrationName,
  verificationPermissions,
  verificationStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Compute `summary` once via `.find`; `cellState` is then derived from `summary` without
  // a second lookup. `getPermissionStateFromSummary` accepts the summary directly.
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
      // Per-row test selector: lets tests target one cell by package policy id (the table
      // renders one cell per row; the shared base selector matches all rows).
      data-test-subj={`${PERMISSION_STATUS_TEST_SUBJECTS.CELL}-${packagePolicyId}`}
      button={<PermissionStateBadge state={cellState} onClick={togglePopover} isClickable />}
    >
      <PermissionStatusPopover
        cellState={cellState}
        summary={summary}
        integrationName={integrationName}
        packagePolicyId={packagePolicyId}
      />
    </EuiPopover>
  );
};
