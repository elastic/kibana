/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CreatedIntegrationRow } from './manage_integrations_table';

export const ManageIntegrationActions: React.FC<{
  integration: CreatedIntegrationRow;
  onEdit: (integrationId: string) => void;
  onDelete: (integrationId: string) => Promise<void>;
}> = ({ integration, onEdit, onDelete }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  return (
    <>
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
            <EuiContextMenuItem key="review" icon="checkInCircleFilled" onClick={closePopover}>
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.actions.reviewApprove"
                defaultMessage="Review & Approve"
              />
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="download" icon="download" onClick={closePopover}>
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.actions.downloadZip"
                defaultMessage="Download .zip package"
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
              icon="trash"
              color="danger"
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
    </>
  );
};
