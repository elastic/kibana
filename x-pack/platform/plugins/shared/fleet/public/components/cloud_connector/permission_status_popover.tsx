/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiHorizontalRule,
  EuiToolTip,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import { PERMISSION_STATUS_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type {
  PackagePolicyPermissionSummary,
  PermissionResult,
  PermissionStatus,
} from '../../../common/types/models/cloud_connector';

import type { CellState } from './get_permission_state';
import { IntegrationActionButtons } from './integration_action_buttons';

const INLINE_CAP = 5;

const GROUP_ORDER: ReadonlyArray<{
  status: PermissionStatus;
  iconType: string;
  color: string;
  label: (count: number) => string;
}> = [
  {
    status: 'error',
    iconType: 'alert',
    color: 'danger',
    label: (count) =>
      i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.errorGroup', {
        defaultMessage: 'Error ({count})',
        values: { count },
      }),
  },
  {
    status: 'denied',
    iconType: 'minusInCircle',
    color: 'danger',
    label: (count) =>
      i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.deniedGroup', {
        defaultMessage: 'Denied ({count})',
        values: { count },
      }),
  },
  {
    status: 'required',
    iconType: 'warning',
    color: 'warning',
    label: (count) =>
      i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.requiredGroup', {
        defaultMessage: 'Required ({count})',
        values: { count },
      }),
  },
  {
    status: 'verified',
    iconType: 'check',
    color: 'success',
    label: (count) =>
      i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.verifiedGroup', {
        defaultMessage: 'Verified ({count})',
        values: { count },
      }),
  },
];

interface PermissionGroupProps {
  status: PermissionStatus;
  iconType: string;
  color: string;
  label: string;
  permissions: PermissionResult[];
  initiallyCollapsed?: boolean;
}

const PermissionGroup: React.FC<PermissionGroupProps> = ({
  status,
  iconType,
  color,
  label,
  permissions,
  initiallyCollapsed = false,
}) => {
  const [expanded, setExpanded] = React.useState(!initiallyCollapsed);
  const [showAll, setShowAll] = React.useState(false);

  const visible = showAll ? permissions : permissions.slice(0, INLINE_CAP);
  const overflow = permissions.length - visible.length;

  const toggle = () => setExpanded((v) => !v);

  return (
    <div data-test-subj={`${PERMISSION_STATUS_TEST_SUBJECTS.PERMISSION_GROUP}-${status}`}>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        css={{ cursor: 'pointer' }}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} color={color} size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">
            <strong>{label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={expanded ? 'arrowDown' : 'arrowRight'}
            size="s"
            color="subdued"
            aria-hidden={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {expanded && (
        <>
          <EuiSpacer size="xs" />
          <ul css={{ paddingLeft: 24, margin: 0 }}>
            {visible.map((permission, idx) => (
              <li
                key={`${permission.action}-${idx}`}
                data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.PERMISSION_LIST_ITEM}
                css={{ fontFamily: 'monospace', fontSize: 13 }}
              >
                {permission.action}
                {permission.error_code && (
                  <EuiText size="xs" color="subdued" css={{ display: 'inline', marginLeft: 8 }}>
                    ({permission.error_code})
                  </EuiText>
                )}
              </li>
            ))}
            {overflow > 0 && (
              <li>
                <EuiLink onClick={() => setShowAll(true)}>
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.permissionStatus.popover.showMore"
                    defaultMessage="…and {count} more"
                    values={{ count: overflow }}
                  />
                </EuiLink>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

interface NonResultBodyProps {
  state: CellState;
}

const NonResultBody: React.FC<NonResultBodyProps> = ({ state }) => {
  const copy = useMemo(() => {
    switch (state.state) {
      case 'verifying':
        return i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.verifyingBody', {
          defaultMessage:
            'Setting up verification for this integration. Permission status will appear here once verification completes — typically within a few minutes.',
        });
      case 'verification_failed':
        return i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.popover.verificationFailedBody',
          {
            defaultMessage:
              "We couldn't set up verification for this integration. Please contact support if this persists.",
          }
        );
      case 'unknown':
      default:
        return i18n.translate('xpack.fleet.cloudConnector.permissionStatus.popover.unknownBody', {
          defaultMessage:
            'Permission status is not yet available. Next verification will run within the hour.',
        });
    }
  }, [state.state]);

  return <EuiText size="s">{copy}</EuiText>;
};

interface PermissionStatusPopoverProps {
  cellState: CellState;
  summary: PackagePolicyPermissionSummary | undefined;
  integrationName: string;
}

export const PermissionStatusPopover: React.FC<PermissionStatusPopoverProps> = ({
  cellState,
  summary,
  integrationName,
}) => {
  const { euiTheme } = useEuiTheme();

  const isResultState =
    cellState.state === 'verified' ||
    cellState.state === 'required' ||
    cellState.state === 'denied' ||
    cellState.state === 'error';

  // Group permissions by status — keeping declared GROUP_ORDER.
  const grouped = useMemo(() => {
    if (!summary?.permissions) return null;
    const map: Partial<Record<PermissionStatus, PermissionResult[]>> = {};
    for (const permission of summary.permissions) {
      map[permission.status] = map[permission.status] ?? [];
      map[permission.status]!.push(permission);
    }
    return map;
  }, [summary?.permissions]);

  return (
    <div
      css={{ minWidth: 320, maxWidth: 480, padding: euiTheme.size.s }}
      data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.POPOVER}
    >
      <EuiPopoverTitle
        paddingSize="s"
        data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.POPOVER_TITLE}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{integrationName}</strong>
            </EuiText>
          </EuiFlexItem>
          {summary?.last_verified_at && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={new Date(summary.last_verified_at).toLocaleString()}
                data-test-subj={PERMISSION_STATUS_TEST_SUBJECTS.POPOVER_LAST_VERIFIED}
              >
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.permissionStatus.popover.lastVerified"
                    defaultMessage="Last verified {when}"
                    values={{
                      when: <FormattedRelative value={summary.last_verified_at} />,
                    }}
                  />
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <EuiSpacer size="s" />

      {isResultState && grouped ? (
        GROUP_ORDER.map(({ status, iconType, color, label }) => {
          const permissions = grouped[status];
          if (!permissions || permissions.length === 0) return null;
          return (
            <React.Fragment key={status}>
              <PermissionGroup
                status={status}
                iconType={iconType}
                color={color}
                label={label(permissions.length)}
                permissions={permissions}
                initiallyCollapsed={status === 'verified'}
              />
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })
      ) : (
        <NonResultBody state={cellState} />
      )}

      {summary?.policy_template && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiPopoverFooter paddingSize="s">
            <IntegrationActionButtons />
          </EuiPopoverFooter>
        </>
      )}
    </div>
  );
};
