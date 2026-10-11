/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ActionPolicyActionsMenu } from '../../../components/action_policy/action_policy_actions_menu';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from '../../../components/action_policy/labels';
import { useIsActionPoliciesLicenseValid } from '../../../hooks/use_is_action_policies_license_valid';

interface ActionPolicyActionsCellProps {
  policy: ActionPolicyResponse;
  canWrite: boolean;
  onViewDetails: (policy: ActionPolicyResponse) => void;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onUpdateApiKey: (id: string) => void;
  isDisabled?: boolean;
}

export const ActionPolicyActionsCell = ({
  policy,
  canWrite,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onUpdateApiKey,
  isDisabled = false,
}: ActionPolicyActionsCellProps) => {
  const isLicenseValid = useIsActionPoliciesLicenseValid();

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      {canWrite && (
        <>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                isLicenseValid
                  ? i18n.translate('xpack.alertingV2.actionPoliciesList.action.edit.description', {
                      defaultMessage: 'Edit this action policy',
                    })
                  : ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE
              }
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="pencil"
                color="text"
                aria-label={i18n.translate(
                  'xpack.alertingV2.actionPoliciesList.action.edit.description',
                  { defaultMessage: 'Edit this action policy' }
                )}
                onClick={() => onEdit(policy.id)}
                isDisabled={isDisabled || !isLicenseValid}
                data-test-subj={`editActionPolicyButton-${policy.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ActionPolicyActionsMenu
              policy={policy}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onClone={onClone}
              onDelete={onDelete}
              onUpdateApiKey={onUpdateApiKey}
              isDisabled={isDisabled}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
