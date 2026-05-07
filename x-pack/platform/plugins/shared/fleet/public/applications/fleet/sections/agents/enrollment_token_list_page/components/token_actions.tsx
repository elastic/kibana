/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { EnrollmentAPIKey } from '../../../../types';
import { useStartServices, sendDeleteOneEnrollmentAPIKey } from '../../../../hooks';
import { HierarchicalActionsMenu } from '../../components';
import type { MenuItem } from '../../components';

import { ConfirmRevokeModal, ConfirmDeleteModal } from './confirm_bulk_action_modal';

export type BulkAction = 'delete' | 'revoke';

export const Divider: React.FunctionComponent = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: 0,
        height: euiTheme.size.l,
        borderLeft: euiTheme.border.thin,
      }}
    />
  );
};

export const TokenActions: React.FunctionComponent<{
  apiKey: EnrollmentAPIKey;
  refresh: () => void;
}> = ({ apiKey, refresh }) => {
  const { notifications } = useStartServices();
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

  const onCancelAction = () => setPendingAction(null);

  const onConfirmRevoke = async () => {
    try {
      const res = await sendDeleteOneEnrollmentAPIKey(apiKey.id);
      if (res.error) throw res.error;
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }
    setPendingAction(null);
    refresh();
  };

  const onConfirmDelete = async () => {
    try {
      const res = await sendDeleteOneEnrollmentAPIKey(apiKey.id, { forceDelete: true });
      if (res.error) throw res.error;
    } catch (err) {
      notifications.toasts.addError(err as Error, { title: 'Error' });
    }
    setPendingAction(null);
    refresh();
  };

  return (
    <>
      {pendingAction === 'revoke' && (
        <ConfirmRevokeModal count={1} onCancel={onCancelAction} onConfirm={onConfirmRevoke} />
      )}
      {pendingAction === 'delete' && (
        <ConfirmDeleteModal count={1} onCancel={onCancelAction} onConfirm={onConfirmDelete} />
      )}
      <HierarchicalActionsMenu
        items={getTokenActionItems({
          onRevoke: () => setPendingAction('revoke'),
          onDelete: () => setPendingAction('delete'),
          revokeDisabled: !apiKey.active,
        })}
        data-test-subj="enrollmentTokenTable.actionsMenu"
      />
    </>
  );
};

export const getTokenActionItems = ({
  onRevoke,
  onDelete,
  plural,
  revokeDisabled,
}: {
  onRevoke: () => void;
  onDelete: () => void;
  plural?: boolean;
  revokeDisabled?: boolean;
}): MenuItem[] => [
  {
    id: 'revoke',
    name: plural
      ? i18n.translate('xpack.fleet.enrollmentTokensList.revokeTokensAction', {
          defaultMessage: 'Revoke tokens',
        })
      : i18n.translate('xpack.fleet.enrollmentTokensList.revokeTokenAction', {
          defaultMessage: 'Revoke token',
        }),
    icon: 'minusInCircle',
    disabled: revokeDisabled,
    'data-test-subj': plural
      ? 'enrollmentTokensList.bulkRevokeButton'
      : 'enrollmentTokenTable.revokeBtn',
    onClick: onRevoke,
  },
  {
    id: 'delete',
    name: plural
      ? i18n.translate('xpack.fleet.enrollmentTokensList.deleteTokensAction', {
          defaultMessage: 'Delete tokens',
        })
      : i18n.translate('xpack.fleet.enrollmentTokensList.deleteTokenAction', {
          defaultMessage: 'Delete token',
        }),
    icon: 'trash',
    'data-test-subj': plural
      ? 'enrollmentTokensList.bulkDeleteButton'
      : 'enrollmentTokenTable.deleteBtn',
    onClick: onDelete,
  },
];
