/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiHorizontalRule, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type {
  PackagePolicyPermissionSummary,
  VerificationStatus,
} from '../../../common/types/models/cloud_connector';

import { VerificationTimeline } from './verification_timeline';
import { CurrentPermissionsTable } from './current_permissions_table';
import { IntegrationActionButtons } from './integration_action_buttons';

interface PermissionStatusRowExpansionProps {
  summary: PackagePolicyPermissionSummary | undefined;
  verificationStatus: VerificationStatus | undefined;
  verificationStartedAt?: string;
  verificationFailedAt?: string;
  packagePolicyId: string;
}

export const PermissionStatusRowExpansion: React.FC<PermissionStatusRowExpansionProps> = ({
  summary,
  verificationStatus,
  verificationStartedAt,
  verificationFailedAt,
  packagePolicyId,
}) => {
  if (!summary) {
    const emptyTitle =
      verificationStatus === 'pending'
        ? i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.verifyingTitle',
            { defaultMessage: 'Verification in progress' }
          )
        : verificationStatus === 'failed'
        ? i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.failedTitle',
            { defaultMessage: 'Verification failed' }
          )
        : i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.unknownTitle',
            { defaultMessage: 'No verification data yet' }
          );

    const emptyBody =
      verificationStatus === 'pending'
        ? i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.verifyingBody',
            {
              defaultMessage:
                'Permission results will appear here once the current verification run completes.',
            }
          )
        : verificationStatus === 'failed'
        ? i18n.translate('xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.failedBody', {
            defaultMessage:
              "We couldn't deploy the verifier for this integration. Contact support if this persists.",
          })
        : i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.empty.unknownBody',
            {
              defaultMessage:
                'Permission status will appear here after the next verification run, typically within the hour.',
            }
          );

    return (
      <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.CONTAINER}>
        <EuiEmptyPrompt
          iconType="inspect"
          title={<h4>{emptyTitle}</h4>}
          body={<EuiText size="s">{emptyBody}</EuiText>}
          paddingSize="m"
        />
      </div>
    );
  }

  const hasVerifiedPermission = summary.permissions?.some((p) => p.status === 'verified') ?? false;

  return (
    <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.CONTAINER}>
      <EuiText size="xs">
        <h5>
          {i18n.translate('xpack.fleet.cloudConnector.permissionStatus.rowExpand.timelineHeader', {
            defaultMessage: 'Verification Timeline',
          })}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <VerificationTimeline
        summary={summary}
        verificationStartedAt={verificationStartedAt}
        verificationFailedAt={verificationFailedAt}
      />

      <EuiHorizontalRule margin="m" />

      <EuiText size="xs">
        <h5>
          {i18n.translate(
            'xpack.fleet.cloudConnector.permissionStatus.rowExpand.permissionsHeader',
            { defaultMessage: 'Current Permissions' }
          )}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <CurrentPermissionsTable permissions={summary.permissions ?? []} />

      <EuiHorizontalRule margin="m" />

      <IntegrationActionButtons
        policyTemplate={summary.policy_template}
        packagePolicyId={packagePolicyId}
        hasVerifiedPermission={hasVerifiedPermission}
      />
    </div>
  );
};
