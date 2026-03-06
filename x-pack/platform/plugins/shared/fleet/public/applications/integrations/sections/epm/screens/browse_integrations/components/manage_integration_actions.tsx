/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataStreamResponse } from '@kbn/automatic-import-v2-plugin/common';

import type { CreatedIntegrationRow } from './manage_integrations_table';
import type { ReviewIntegrationDetails } from './review_approve_modal';
import { ReviewApproveModal } from './review_approve_modal';

export type { ReviewIntegrationDetails } from './review_approve_modal';

export const ManageIntegrationActions: React.FC<{
  integration: CreatedIntegrationRow;
  canReviewApprove: boolean;
  inlineActionType?: 'reviewApprove' | 'editIntegration';
  showMenuButton?: boolean;
  onEdit: (integrationId: string) => void;
  onDelete: (integrationId: string) => Promise<void>;
  DataStreamResultsFlyoutComponent?: React.ComponentType<{
    integrationId: string;
    dataStream: DataStreamResponse;
    onClose: () => void;
  }>;
  onFetchReviewDetails: (integrationId: string) => Promise<ReviewIntegrationDetails>;
  onApproveAndDeploy: (integrationId: string, version: string) => Promise<void>;
}> = ({
  integration,
  canReviewApprove,
  inlineActionType,
  showMenuButton = true,
  onEdit,
  onDelete,
  DataStreamResultsFlyoutComponent,
  onFetchReviewDetails,
  onApproveAndDeploy,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const openDeleteConfirm = useCallback(() => {
    setIsPopoverOpen(false);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(integration.integrationId);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [onDelete, integration.integrationId]);

  const openReviewModal = useCallback(() => {
    setIsPopoverOpen(false);
    setShowReviewModal(true);
  }, []);

  const closeReviewModal = useCallback(() => {
    setShowReviewModal(false);
  }, []);

  return (
    <>
      {inlineActionType === 'reviewApprove' && (
        <EuiButtonEmpty
          size="xs"
          iconType="checkInCircleFilled"
          iconSide="left"
          onClick={openReviewModal}
          style={{
            backgroundColor: euiTheme.colors.backgroundLightPrimary,
            paddingLeft: euiTheme.size.xs,
            paddingRight: euiTheme.size.xs,
            whiteSpace: 'nowrap',
          }}
        >
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.reviewApproveInline"
            defaultMessage="Review and Approve"
          />
        </EuiButtonEmpty>
      )}
      {inlineActionType === 'editIntegration' && (
        <EuiButtonEmpty size="s" onClick={() => onEdit(integration.integrationId)}>
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.editInline"
            defaultMessage="Edit Integration"
          />
        </EuiButtonEmpty>
      )}
      {showMenuButton && (
        <EuiPopover
          anchorPosition="downRight"
          panelPaddingSize="none"
          button={
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label={i18n.translate(
                'xpack.fleet.epmList.manageIntegrations.actions.openMenuLabel',
                { defaultMessage: 'Open actions menu' }
              )}
              onClick={togglePopover}
              data-test-subj="manageIntegrationActionsBtn"
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="review"
                icon="grid"
                disabled={!canReviewApprove}
                toolTipContent={
                  canReviewApprove
                    ? undefined
                    : i18n.translate(
                        'xpack.fleet.epmList.manageIntegrations.actions.reviewApproveDisabledHelp',
                        {
                          defaultMessage:
                            'Review & Approve is available only when all data streams are successful.',
                        }
                      )
                }
                onClick={openReviewModal}
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewApprove"
                  defaultMessage="Review & Approve"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="edit"
                icon="pencil"
                onClick={() => {
                  closePopover();
                  onEdit(integration.integrationId);
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.edit"
                  defaultMessage="Edit"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
                onClick={openDeleteConfirm}
              >
                <EuiTextColor color="danger">
                  <FormattedMessage
                    id="xpack.fleet.epmList.manageIntegrations.actions.delete"
                    defaultMessage="Delete"
                  />
                </EuiTextColor>
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      )}
      {showDeleteConfirm && (
        <EuiConfirmModal
          aria-label={i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmAriaLabel',
            { defaultMessage: 'Confirm delete integration' }
          )}
          title={i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmTitle',
            {
              defaultMessage: 'Delete integration',
            }
          )}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={
            isDeleting
              ? i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmDeleting',
                  { defaultMessage: 'Deleting…' }
                )
              : i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmButton',
                  { defaultMessage: 'Delete' }
                )
          }
          buttonColor="danger"
          isLoading={isDeleting}
        >
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.deleteConfirmBody"
            defaultMessage='Are you sure you want to delete the integration "{name}"? This action cannot be undone.'
            values={{ name: integration.title }}
          />
        </EuiConfirmModal>
      )}
      <ReviewApproveModal
        isOpen={showReviewModal}
        integrationId={integration.integrationId}
        onClose={closeReviewModal}
        onEdit={onEdit}
        onFetchReviewDetails={onFetchReviewDetails}
        onApproveAndDeploy={onApproveAndDeploy}
        DataStreamResultsFlyoutComponent={DataStreamResultsFlyoutComponent}
      />
    </>
  );
};
