/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PERMISSION_STATUS_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';

import type { CellState } from './get_permission_state';

/**
 * Renders one state of the Permission Status cell badge.
 *
 * Visual contract per the epic:
 *   verified            — success / check
 *   required (N)        — warning / warning
 *   denied (N)          — danger / minusInCircle
 *   error (N)           — danger / alert
 *   verifying           — primary / clock
 *   verification_failed — danger / unlink
 *   unknown             — subdued / dot
 *
 * Color + icon + text together; never color-only (accessibility).
 */

interface BadgeVisual {
  color: EuiBadgeProps['color'];
  iconType: string;
  label: string;
  ariaLabel: string;
}

function visualFor(state: CellState, hideCount: boolean): BadgeVisual {
  switch (state.state) {
    case 'verified':
      return {
        color: 'success',
        iconType: 'check',
        label: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.verified', {
          defaultMessage: 'Verified',
        }),
        ariaLabel: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.badge.verifiedAria',
          { defaultMessage: 'All permissions verified' }
        ),
      };
    case 'required':
      return {
        color: 'warning',
        iconType: 'warning',
        label: hideCount
          ? i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.requiredSimple', {
              defaultMessage: 'Required',
            })
          : i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.required', {
              defaultMessage: 'Required ({count})',
              values: { count: state.count },
            }),
        ariaLabel: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.badge.requiredAria',
          {
            defaultMessage:
              '{count, plural, one {# required permission missing} other {# required permissions missing}}',
            values: { count: state.count },
          }
        ),
      };
    case 'denied':
      return {
        color: 'danger',
        iconType: 'minusInCircle',
        label: hideCount
          ? i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.deniedSimple', {
              defaultMessage: 'Denied',
            })
          : i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.denied', {
              defaultMessage: 'Denied ({count})',
              values: { count: state.count },
            }),
        ariaLabel: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.deniedAria', {
          defaultMessage: '{count, plural, one {# permission denied} other {# permissions denied}}',
          values: { count: state.count },
        }),
      };
    case 'error':
      return {
        color: 'danger',
        iconType: 'alert',
        label: hideCount
          ? i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.errorSimple', {
              defaultMessage: 'Error',
            })
          : i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.error', {
              defaultMessage: 'Error ({count})',
              values: { count: state.count },
            }),
        ariaLabel: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.errorAria', {
          defaultMessage:
            '{count, plural, one {# permission errored} other {# permissions errored}}',
          values: { count: state.count },
        }),
      };
    case 'verifying':
      return {
        color: 'primary',
        iconType: 'clock',
        label: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.verifying', {
          defaultMessage: 'Verifying…',
        }),
        ariaLabel: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.badge.verifyingAria',
          { defaultMessage: 'Verification in progress' }
        ),
      };
    case 'verification_failed':
      return {
        color: 'danger',
        iconType: 'unlink',
        label: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.badge.verificationFailed',
          { defaultMessage: 'Verification Failed' }
        ),
        ariaLabel: i18n.translate(
          'xpack.fleet.cloudConnector.permissionStatus.badge.verificationFailedAria',
          { defaultMessage: 'Verifier deployment failed' }
        ),
      };
    case 'unknown':
    default:
      return {
        color: 'hollow',
        iconType: 'dot',
        label: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.unknown', {
          defaultMessage: 'Unknown',
        }),
        ariaLabel: i18n.translate('xpack.fleet.cloudConnector.permissionStatus.badge.unknownAria', {
          defaultMessage: 'Verification status unknown',
        }),
      };
  }
}

interface PermissionStateBadgeProps {
  state: CellState;
  onClick?: () => void;
  isClickable?: boolean;
  hideCount?: boolean;
}

export const PermissionStateBadge: React.FC<PermissionStateBadgeProps> = ({
  state,
  onClick,
  isClickable = false,
  hideCount = false,
}) => {
  const visual = visualFor(state, hideCount);

  const commonProps: Partial<EuiBadgeProps> = {
    color: visual.color,
    iconType: visual.iconType,
    'aria-label': visual.ariaLabel,
    'data-test-subj': PERMISSION_STATUS_TEST_SUBJECTS.BADGE,
  };

  if (isClickable && onClick) {
    return (
      <EuiBadge {...commonProps} onClick={onClick} onClickAriaLabel={visual.ariaLabel}>
        {visual.label}
      </EuiBadge>
    );
  }

  return <EuiBadge {...commonProps}>{visual.label}</EuiBadge>;
};
