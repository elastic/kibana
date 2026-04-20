/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { BulkDeleteConfirmationModal } from './bulk_delete_confirmation_modal';
import { BulkSnoozeModal } from './bulk_snooze_modal';
import { UpdateApiKeyConfirmationModal } from './update_api_key_confirmation_modal';

type BulkAction = 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze' | 'update_api_key';

interface NotificationPoliciesBulkActionsProps {
  selectedPolicies: NotificationPolicyResponse[];
  onClearSelection: () => void;
  onBulkAction: (action: BulkAction, snoozedUntil?: string) => void;
  isLoading: boolean;
}

export const NotificationPoliciesBulkActions = ({
  selectedPolicies,
  onClearSelection,
  onBulkAction,
  isLoading,
}: NotificationPoliciesBulkActionsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'delete' | 'snooze' | 'update_api_key' | null>(
    null
  );

  const count = selectedPolicies.length;

  const handleAction = (action: BulkAction) => {
    setIsPopoverOpen(false);
    if (action === 'delete') {
      setActiveModal('delete');
    } else if (action === 'snooze') {
      setActiveModal('snooze');
    } else if (action === 'update_api_key') {
      setActiveModal('update_api_key');
    } else {
      onBulkAction(action);
    }
  };

  const panels = [
    {
      id: 0,
      items: [
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.enable', {
            defaultMessage: 'Enable',
          }),
          icon: 'check',
          onClick: () => handleAction('enable'),
          disabled: isLoading,
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.disable', {
            defaultMessage: 'Disable',
          }),
          icon: 'cross',
          onClick: () => handleAction('disable'),
          disabled: isLoading,
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.snooze', {
            defaultMessage: 'Snooze',
          }),
          icon: 'bellSlash',
          onClick: () => handleAction('snooze'),
          disabled: isLoading,
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.unsnooze', {
            defaultMessage: 'Unsnooze',
          }),
          icon: 'bell',
          onClick: () => handleAction('unsnooze'),
          disabled: isLoading,
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.updateApiKey', {
            defaultMessage: 'Update API keys',
          }),
          icon: 'key',
          onClick: () => handleAction('update_api_key'),
          disabled: isLoading,
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPolicy.bulkAction.delete', {
            defaultMessage: 'Delete',
          }),
          icon: 'trash',
          onClick: () => handleAction('delete'),
          disabled: isLoading,
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate(
              'xpack.alertingV2.notificationPolicy.bulkAction.selectedCount',
              { defaultMessage: '{count} Selected', values: { count } }
            )}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="arrowDown"
                iconSide="right"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                isLoading={isLoading}
              >
                <FormattedMessage
                  id="xpack.alertingV2.notificationPolicy.bulkAction.selectedCount"
                  defaultMessage="{count} Selected"
                  values={{ count }}
                />
              </EuiButtonEmpty>
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" onClick={onClearSelection} disabled={isLoading}>
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.bulkAction.clearSelection"
              defaultMessage="Clear selection"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {activeModal === 'delete' && (
        <BulkDeleteConfirmationModal
          count={count}
          onCancel={() => setActiveModal(null)}
          onConfirm={() => {
            onBulkAction('delete');
            setActiveModal(null);
          }}
          isLoading={isLoading}
        />
      )}

      {activeModal === 'snooze' && (
        <BulkSnoozeModal
          count={count}
          onApplySnooze={(snoozedUntil) => {
            onBulkAction('snooze', snoozedUntil);
            setActiveModal(null);
          }}
          onCancel={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'update_api_key' && (
        <UpdateApiKeyConfirmationModal
          count={count}
          onCancel={() => setActiveModal(null)}
          onConfirm={() => {
            onBulkAction('update_api_key');
            setActiveModal(null);
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
