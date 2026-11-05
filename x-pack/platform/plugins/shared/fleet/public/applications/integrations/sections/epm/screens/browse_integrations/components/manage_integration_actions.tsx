/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAuthz, useAutomaticImportAuthz, useStartServices } from '../../../../../hooks';

import type {
  AutomaticImportTelemetry,
  CreatedIntegrationRow,
  DataStreamResultsFlyoutComponent,
} from './manage_integrations_table';
import type { ReviewIntegrationDetails } from './review_approve_modal';
import { ReviewApproveModal } from './review_approve_modal';

export type { ReviewIntegrationDetails } from './review_approve_modal';

export const ManageIntegrationActions: React.FC<{
  integration: CreatedIntegrationRow;
  isPackageReady: boolean;
  installedVersion?: string;
  inlineActionType?: 'reviewApprove' | 'editIntegration';
  showMenuButton?: boolean;
  onEdit: (integrationId: string) => void;
  onDelete: (integrationId: string) => Promise<void>;
  DataStreamResultsFlyoutComponent?: DataStreamResultsFlyoutComponent;
  onFetchReviewDetails: (integrationId: string) => Promise<ReviewIntegrationDetails>;
  onApproveAndInstall: (
    integrationId: string,
    version: string,
    categories: string[],
    autoInstallAfterApproval: boolean
  ) => Promise<void>;
  onDownloadZip?: (integrationId: string) => Promise<void>;
  onInstallToCluster?: (
    integrationId: string,
    options?: { skipSuccessToast?: boolean }
  ) => Promise<void>;
}> = ({
  integration,
  isPackageReady,
  installedVersion,
  inlineActionType,
  showMenuButton = true,
  onEdit,
  onDelete,
  DataStreamResultsFlyoutComponent,
  onFetchReviewDetails,
  onApproveAndInstall,
  onDownloadZip,
  onInstallToCluster,
}) => {
  const { euiTheme } = useEuiTheme();
  const { automaticImport } = useStartServices();
  const { canEdit, canDelete, canApprove } = useAutomaticImportAuthz();
  const canInstallPackages = useAuthz().integrations.installPackages;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const isApproved = integration.status === 'approved';

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const openDeleteConfirm = useCallback(() => {
    setIsPopoverOpen(false);
    setShowDeleteConfirm(true);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (!onDownloadZip) return;
    setIsPopoverOpen(false);
    setIsDownloadingZip(true);
    try {
      await onDownloadZip(integration.integrationId);
    } finally {
      setIsDownloadingZip(false);
    }
  }, [onDownloadZip, integration.integrationId]);

  const handleInstallToCluster = useCallback(async () => {
    if (!onInstallToCluster) return;
    setIsPopoverOpen(false);
    setIsInstalling(true);
    try {
      await onInstallToCluster(integration.integrationId);
    } finally {
      setIsInstalling(false);
    }
  }, [onInstallToCluster, integration.integrationId]);

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
    (automaticImport?.telemetry as AutomaticImportTelemetry)?.reportEvent(
      'automatic_import_review_approve_menu_clicked',
      { integrationId: integration.integrationId, version: integration.version ?? '' }
    );
  }, [automaticImport, integration.integrationId, integration.version]);

  // Read-only users open the same dialog to browse data streams and their results.
  const openResultsModal = useCallback(() => {
    setIsPopoverOpen(false);
    setShowReviewModal(true);
  }, []);

  const closeReviewModal = useCallback(() => {
    setShowReviewModal(false);
  }, []);

  const viewResultsLabel = i18n.translate(
    'xpack.fleet.epmList.manageIntegrations.actions.viewResults',
    { defaultMessage: 'View results' }
  );
  // Results exist per data stream, so viewing them only needs at least one data stream.
  const hasDataStreams = integration.totalDataStreamCount > 0;
  const viewResultsDisabledTooltip = !hasDataStreams
    ? i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.viewResultsDisabledHelp', {
        defaultMessage: 'Results are available once the integration has data streams.',
      })
    : undefined;

  const isSameVersionInstalled =
    installedVersion !== undefined && installedVersion === integration.version;

  const getInstallToClusterTooltip = () => {
    if (!canInstallPackages) {
      return i18n.translate(
        'xpack.fleet.epmList.manageIntegrations.actions.installMissingPrivilegeHelp',
        { defaultMessage: 'You do not have permission to install integrations.' }
      );
    }
    if (isSameVersionInstalled) {
      return i18n.translate(
        'xpack.fleet.epmList.manageIntegrations.actions.installAlreadyInstalledHelp',
        { defaultMessage: 'This integration is already installed.' }
      );
    }
    if (!isApproved) {
      return i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.installDisabledHelp', {
        defaultMessage: 'Install is available only for approved integrations.',
      });
    }
  };

  const reviewApproveDisabled = !isPackageReady || isApproved;
  const reviewApproveTooltip = isApproved
    ? i18n.translate(
        'xpack.fleet.epmList.manageIntegrations.actions.reviewApproveAlreadyApprovedHelp',
        { defaultMessage: 'This integration has already been approved.' }
      )
    : !isPackageReady
    ? i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.reviewApproveDisabledHelp', {
        defaultMessage: 'Review & Approve is available only when all data streams are successful.',
      })
    : undefined;

  return (
    <>
      {inlineActionType === 'reviewApprove' && canApprove && (
        <EuiButtonEmpty
          size="xs"
          color="primary"
          iconType="checkInCircleFilled"
          iconSide="left"
          onClick={openReviewModal}
          data-test-subj="manageIntegrationReviewApproveInlineBtn"
          style={{
            backgroundColor: euiTheme.colors.backgroundLightPrimary,
            borderRadius: euiTheme.border.radius.small,
            paddingLeft: euiTheme.size.s,
            paddingRight: euiTheme.size.s,
            gap: '4px',
            fontFamily: euiTheme.font.family,
            fontWeight: euiTheme.font.weight.medium,
            fontSize: '12px',
            lineHeight: euiTheme.size.l,
            letterSpacing: '0px',
            whiteSpace: 'nowrap',
          }}
        >
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.reviewApproveInline"
            defaultMessage="Review & approve"
          />
        </EuiButtonEmpty>
      )}
      {inlineActionType === 'reviewApprove' && !canApprove && (
        <EuiButtonEmpty
          size="xs"
          color="primary"
          iconType="inspect"
          iconSide="left"
          onClick={openResultsModal}
          isDisabled={!hasDataStreams}
          data-test-subj="manageIntegrationViewResultsInlineBtn"
        >
          {viewResultsLabel}
        </EuiButtonEmpty>
      )}
      {inlineActionType === 'editIntegration' && canEdit && (
        <EuiButtonEmpty size="s" onClick={() => onEdit(integration.integrationId)}>
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.editInline"
            defaultMessage="Edit Integration"
          />
        </EuiButtonEmpty>
      )}
      {showMenuButton && (
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.openMenuLabel',
            { defaultMessage: 'Open actions menu' }
          )}
          anchorPosition="downRight"
          panelPaddingSize="none"
          button={
            <EuiToolTip
              content={i18n.translate(
                'xpack.fleet.epmList.manageIntegrations.actions.openMenuLabel',
                { defaultMessage: 'Open actions menu' }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="boxesVertical"
                color="text"
                style={{ color: euiTheme.colors.textSubdued }}
                aria-label={i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.openMenuLabel',
                  { defaultMessage: 'Open actions menu' }
                )}
                onClick={togglePopover}
                data-test-subj="manageIntegrationActionsBtn"
              />
            </EuiToolTip>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <EuiContextMenuPanel
            items={[
              canApprove && (
                <EuiContextMenuItem
                  key="review"
                  icon="grid"
                  disabled={reviewApproveDisabled}
                  toolTipContent={reviewApproveTooltip}
                  onClick={openReviewModal}
                  data-test-subj="manageIntegrationReviewApproveMenuItem"
                >
                  <FormattedMessage
                    id="xpack.fleet.epmList.manageIntegrations.actions.reviewApprove"
                    defaultMessage="Review & Approve"
                  />
                </EuiContextMenuItem>
              ),
              !canApprove && (
                <EuiContextMenuItem
                  key="viewResults"
                  icon="inspect"
                  disabled={!hasDataStreams}
                  toolTipContent={viewResultsDisabledTooltip}
                  onClick={openResultsModal}
                  data-test-subj="manageIntegrationViewResultsMenuItem"
                >
                  {viewResultsLabel}
                </EuiContextMenuItem>
              ),
              <EuiContextMenuItem
                key="installToCluster"
                icon="exportAction"
                disabled={
                  !canInstallPackages || !isApproved || isInstalling || isSameVersionInstalled
                }
                data-test-subj="manageIntegrationInstallMenuItem"
                toolTipContent={getInstallToClusterTooltip()}
                onClick={handleInstallToCluster}
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.installToCluster"
                  defaultMessage="Install"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="downloadZip"
                icon="download"
                disabled={!isPackageReady || isDownloadingZip}
                data-test-subj="manageIntegrationDownloadZipMenuItem"
                toolTipContent={
                  isPackageReady
                    ? undefined
                    : i18n.translate(
                        'xpack.fleet.epmList.manageIntegrations.actions.downloadZipDisabledHelp',
                        {
                          defaultMessage:
                            'Download is available only when all data streams are successful.',
                        }
                      )
                }
                onClick={handleDownloadZip}
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.downloadZip"
                  defaultMessage="Download .zip package"
                />
              </EuiContextMenuItem>,
              canEdit && (
                <EuiContextMenuItem
                  key="edit"
                  icon="pencil"
                  onClick={() => {
                    closePopover();
                    onEdit(integration.integrationId);
                  }}
                  data-test-subj="manageIntegrationEditMenuItem"
                >
                  <FormattedMessage
                    id="xpack.fleet.epmList.manageIntegrations.actions.edit"
                    defaultMessage="Edit"
                  />
                </EuiContextMenuItem>
              ),
              canDelete && (
                <EuiContextMenuItem
                  key="delete"
                  icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
                  onClick={openDeleteConfirm}
                  data-test-subj="manageIntegrationDeleteMenuItem"
                >
                  <EuiTextColor color="danger">
                    <FormattedMessage
                      id="xpack.fleet.epmList.manageIntegrations.actions.delete"
                      defaultMessage="Delete"
                    />
                  </EuiTextColor>
                </EuiContextMenuItem>
              ),
            ].filter((item): item is React.ReactElement => Boolean(item))}
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
        readOnly={!canApprove}
        integrationId={integration.integrationId}
        onClose={closeReviewModal}
        onEdit={onEdit}
        onFetchReviewDetails={onFetchReviewDetails}
        onApproveAndInstall={onApproveAndInstall}
        onInstallToCluster={onInstallToCluster}
        DataStreamResultsFlyoutComponent={DataStreamResultsFlyoutComponent}
      />
    </>
  );
};
