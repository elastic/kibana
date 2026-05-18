/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiInMemoryTable, EuiText, type EuiBasicTableColumn, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type { PermissionResult } from '../../../common/types/models/cloud_connector';

import { PermissionStateBadge } from './permission_state_badge';

/**
 * Full table of permissions for one integration. Used in the row-expand (L3) where
 * the user has more vertical space than the popover (L2) allows for a long list.
 *
 * Sort priority defaults to status worst-first so issues sit at the top — same
 * mental model as the popover's grouped layout, just rendered as a table.
 */

interface CurrentPermissionsTableProps {
  permissions: PermissionResult[];
}

// Worst-state-first ordering for default sort.
const STATUS_PRIORITY: Record<PermissionResult['status'], number> = {
  error: 0,
  denied: 1,
  required: 2,
  verified: 3,
  skipped: 4,
};

export const CurrentPermissionsTable: React.FC<CurrentPermissionsTableProps> = ({
  permissions,
}) => {
  const items = useMemo(
    () =>
      [...permissions].sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.action.localeCompare(b.action)
      ),
    [permissions]
  );

  const columns: Array<EuiBasicTableColumn<PermissionResult>> = useMemo(
    () => [
      {
        field: 'action',
        name: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.actionColumn',
          { defaultMessage: 'Action' }
        ),
        render: (action: string) => (
          <EuiCode transparentBackground css={{ fontSize: 12 }}>
            {action}
          </EuiCode>
        ),
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.statusColumn',
          { defaultMessage: 'Status' }
        ),
        width: '140px',
        render: (status: PermissionResult['status'], permission: PermissionResult) => {
          // Map raw permission status to the badge's CellState shape. `count: 1` is a
          // placeholder — `hideCount` suppresses the suffix so the badge reads
          // "Required" / "Denied" / "Error" instead of "Required (1)" etc., which
          // would be redundant in a one-permission-per-row table.
          const badgeState =
            status === 'verified' || status === 'skipped'
              ? { state: 'verified' as const, count: 1 }
              : status === 'required'
              ? { state: 'required' as const, count: 1 }
              : status === 'denied'
              ? { state: 'denied' as const, count: 1 }
              : { state: 'error' as const, count: 1 };
          return <PermissionStateBadge state={badgeState} hideCount />;
        },
      },
      {
        field: 'required',
        name: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.requiredColumn',
          { defaultMessage: 'Required' }
        ),
        width: '90px',
        render: (required: boolean) =>
          required
            ? i18n.translate(
                'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.requiredYes',
                { defaultMessage: 'Yes' }
              )
            : i18n.translate(
                'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.requiredNo',
                { defaultMessage: 'No' }
              ),
      },
      {
        field: 'message',
        name: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.permissionsTable.messageColumn',
          { defaultMessage: 'Message' }
        ),
        render: (_value: string | undefined, permission: PermissionResult) =>
          permission.message ? (
            <EuiText size="xs">{permission.message}</EuiText>
          ) : (
            <EuiText size="xs" color="subdued">
              —
            </EuiText>
          ),
      },
    ],
    []
  );

  return (
    // `items` is pre-sorted by STATUS_PRIORITY (worst-first). We deliberately omit
    // the `sorting` prop because EuiInMemoryTable's default sort would alpha-sort by
    // the status string value (denied → error → required → skipped → verified),
    // overriding our priority-based order. Re-add `sorting` only if columns also get
    // `sortable: (item) => STATUS_PRIORITY[item.status]` to preserve worst-first.
    <EuiInMemoryTable<PermissionResult>
      items={items}
      columns={columns}
      pagination={items.length > 10 ? { pageSizeOptions: [10, 25] } : false}
      compressed
      data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.PERMISSIONS_TABLE}
    />
  );
};
