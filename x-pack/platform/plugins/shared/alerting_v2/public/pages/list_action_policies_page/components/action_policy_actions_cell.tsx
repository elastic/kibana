/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ActionPolicyActionsMenu } from '../../../components/action_policy/action_policy_actions_menu';

interface ActionPolicyActionsCellProps {
  policy: ActionPolicyResponse;
  onViewDetails: (policy: ActionPolicyResponse) => void;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
  isStateLoading: boolean;
  isDisabled?: boolean;
}

export const ActionPolicyActionsCell = ({
  policy,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  onSnooze,
  onCancelSnooze,
  onUpdateApiKey,
  isStateLoading,
  isDisabled = false,
}: ActionPolicyActionsCellProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="eye"
          color="text"
          aria-label={i18n.translate(
            'xpack.alertingV2.actionPoliciesList.action.viewDetails.description',
            { defaultMessage: 'View action policy details' }
          )}
          onClick={() => onViewDetails(policy)}
          isDisabled={isDisabled}
          data-test-subj="actionPolicyViewDetailsButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="pencil"
          color="text"
          aria-label={i18n.translate(
            'xpack.alertingV2.actionPoliciesList.action.edit.description',
            { defaultMessage: 'Edit this action policy' }
          )}
          onClick={() => onEdit(policy.id)}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ActionPolicyActionsMenu
          policy={policy}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onClone={onClone}
          onDelete={onDelete}
          onEnable={onEnable}
          onDisable={onDisable}
          onSnooze={onSnooze}
          onCancelSnooze={onCancelSnooze}
          onUpdateApiKey={onUpdateApiKey}
          isStateLoading={isStateLoading}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
