/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import { IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type {
  PackagePolicyPermissionSummary,
  VerificationStatus,
} from '../../../common/types/models/cloud_connector';

import { PermissionStateBadge } from './permission_state_badge';
import { getIdentityPermissionState, getIdentityPermissionTotals } from './get_permission_state';
import { getIdentityLastVerifiedAt } from './get_last_verified_at';

interface IdentityPermissionSummaryProps {
  verificationPermissions: PackagePolicyPermissionSummary[] | undefined;
  verificationStatus: VerificationStatus | undefined;
}

export const IdentityPermissionSummary: React.FC<IdentityPermissionSummaryProps> = ({
  verificationPermissions,
  verificationStatus,
}) => {
  const cellState = useMemo(
    () => getIdentityPermissionState(verificationPermissions, verificationStatus),
    [verificationPermissions, verificationStatus]
  );

  const totals = useMemo(
    () => getIdentityPermissionTotals(verificationPermissions),
    [verificationPermissions]
  );

  const lastVerifiedAt = useMemo(
    () => getIdentityLastVerifiedAt(verificationPermissions),
    [verificationPermissions]
  );

  const anyPermissionsCounted =
    totals.verified + totals.required + totals.denied + totals.error + totals.skipped > 0;

  return (
    <div data-test-subj={IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS.CONTAINER}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false} data-test-subj={IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS.BADGE}>
          <PermissionStateBadge state={cellState} />
        </EuiFlexItem>
        {lastVerifiedAt && (
          <EuiFlexItem
            grow={false}
            data-test-subj={IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS.LAST_VERIFIED}
          >
            <EuiToolTip content={new Date(lastVerifiedAt).toLocaleString()}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.identityPermissionSummary.lastVerified"
                  defaultMessage="Last verified {when}"
                  values={{ when: <FormattedRelative value={lastVerifiedAt} /> }}
                />
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {anyPermissionsCounted && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj={IDENTITY_PERMISSION_SUMMARY_TEST_SUBJECTS.COUNTS}
          css={{ marginTop: 4 }}
        >
          <FormattedMessage
            id="xpack.fleet.cloudConnector.identityPermissionSummary.counts"
            defaultMessage="{verified} verified · {required} required · {denied} denied · {error} error across {integrations, plural, one {# integration} other {# integrations}}"
            values={{
              verified: totals.verified,
              required: totals.required,
              denied: totals.denied,
              error: totals.error,
              integrations: totals.integrations,
            }}
          />
        </EuiText>
      )}

      {!anyPermissionsCounted && cellState.state === 'verifying' && (
        <EuiText size="xs" color="subdued" css={{ marginTop: 4 }}>
          {i18n.translate('xpack.fleet.cloudConnector.identityPermissionSummary.verifyingSubtext', {
            defaultMessage:
              'Verification in progress. Per-integration results will appear once it completes.',
          })}
        </EuiText>
      )}

      {!anyPermissionsCounted && cellState.state === 'verification_failed' && (
        <EuiText size="xs" color="subdued" css={{ marginTop: 4 }}>
          {i18n.translate(
            'xpack.fleet.cloudConnector.identityPermissionSummary.verificationFailedSubtext',
            {
              defaultMessage:
                "We couldn't deploy the verifier for this identity. Contact support if this persists.",
            }
          )}
        </EuiText>
      )}
    </div>
  );
};
