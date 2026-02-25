/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import semverValid from 'semver/functions/valid';
import type { DataStreamResponse } from '@kbn/automatic-import-v2-plugin/common';

import type { CreatedIntegrationRow } from './manage_integrations_table';

type ReviewDataStream = DataStreamResponse;

interface ReviewTableRow {
  id: string;
  rowType: 'header' | 'data';
  dataStream?: ReviewDataStream;
}

export interface ReviewIntegrationDetails {
  title: string;
  version?: string;
  dataStreams: ReviewDataStream[];
}

const MAX_VISIBLE_COLLECTION_METHODS = 1;

const DataCollectionMethodsCell: React.FC<{
  inputTypes: Array<{ name: string }>;
  formatInputType: (value: string) => string;
}> = ({ inputTypes, formatInputType }) => {
  const [isMethodsPopoverOpen, setIsMethodsPopoverOpen] = useState(false);
  const methodLabels = inputTypes.map(({ name }) => formatInputType(name));
  const visibleMethods = methodLabels.slice(0, MAX_VISIBLE_COLLECTION_METHODS);
  const hiddenCount = Math.max(0, methodLabels.length - visibleMethods.length);

  if (methodLabels.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        -
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
      {visibleMethods.map((label) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiBadge color="hollow">{label}</EuiBadge>
        </EuiFlexItem>
      ))}
      {hiddenCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiBadge
                color="hollow"
                onClick={() => setIsMethodsPopoverOpen((prev) => !prev)}
                onClickAriaLabel={i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.reviewCollectionMethodsExpandAriaLabel',
                  { defaultMessage: 'Show all data collection methods' }
                )}
              >
                +{hiddenCount}
              </EuiBadge>
            }
            isOpen={isMethodsPopoverOpen}
            closePopover={() => setIsMethodsPopoverOpen(false)}
          >
            <EuiText size="m">
              <strong>
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewCollectionMethodsPopoverTitle"
                  defaultMessage="Data Collection Methods"
                />
              </strong>
            </EuiText>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {methodLabels.map((label) => (
                <EuiFlexItem key={label} grow={false}>
                  <EuiBadge color="hollow">{label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const ManageIntegrationActions: React.FC<{
  integration: CreatedIntegrationRow;
  canReviewApprove: boolean;
  inlineActionType?: 'reviewApprove' | 'editIntegration';
  showMenuButton?: boolean;
  onEdit: (integrationId: string) => void;
  onDelete: (integrationId: string) => Promise<void>;
  DataStreamResultsFlyoutComponent?: React.ComponentType<{
    integrationId: string;
    dataStream: ReviewDataStream;
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
  const [isLoadingReviewDetails, setIsLoadingReviewDetails] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewDetails, setReviewDetails] = useState<ReviewIntegrationDetails | null>(null);
  const [reviewVersion, setReviewVersion] = useState('');
  const [isVersionTouched, setIsVersionTouched] = useState(false);
  const [selectedDataStreamForFlyout, setSelectedDataStreamForFlyout] =
    useState<ReviewDataStream | null>(null);

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

  const formatInputType = useCallback((value: string) => {
    const withSpaces = value.replace(/[_-]/g, ' ');
    return withSpaces.replace(/\b\w/g, (match) => match.toUpperCase());
  }, []);

  const loadReviewDetails = useCallback(async () => {
    setIsLoadingReviewDetails(true);
    setReviewError(null);
    try {
      const details = await onFetchReviewDetails(integration.integrationId);
      setReviewDetails(details);
      setReviewVersion(details.version ?? '');
      setIsVersionTouched(false);
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.reviewLoadError', {
              defaultMessage: 'Failed to load integration details.',
            })
      );
    } finally {
      setIsLoadingReviewDetails(false);
    }
  }, [integration.integrationId, onFetchReviewDetails]);

  const openReviewModal = useCallback(() => {
    setIsPopoverOpen(false);
    setShowReviewModal(true);
    setReviewDetails(null);
    setReviewVersion('');
    setIsVersionTouched(false);
    setReviewError(null);
    loadReviewDetails();
  }, [loadReviewDetails]);

  const closeReviewModal = useCallback(() => {
    if (isApproving) {
      return;
    }
    setShowReviewModal(false);
    setReviewDetails(null);
    setReviewVersion('');
    setIsVersionTouched(false);
    setReviewError(null);
  }, [isApproving]);

  const normalizedVersion = reviewVersion.trim();
  const isVersionValid = Boolean(semverValid(normalizedVersion));
  const isVersionInputInvalid = isVersionTouched && !isVersionValid;
  const versionValidationMessage = !normalizedVersion
    ? i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.reviewVersionRequired', {
        defaultMessage: 'Version is required.',
      })
    : i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.reviewVersionInvalid', {
        defaultMessage: 'Enter a valid semantic version (for example, 1.0.0).',
      });

  const handleApproveAndDeploy = useCallback(async () => {
    const version = reviewVersion.trim();
    if (!semverValid(version)) {
      setIsVersionTouched(true);
      setReviewError(
        i18n.translate(
          'xpack.fleet.epmList.manageIntegrations.actions.reviewVersionValidationError',
          {
            defaultMessage: 'Provide a valid version before approving and deploying.',
          }
        )
      );
      return;
    }

    setIsApproving(true);
    setReviewError(null);
    try {
      await onApproveAndDeploy(integration.integrationId, version);
      setShowReviewModal(false);
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.reviewApproveError', {
              defaultMessage: 'Failed to approve and deploy integration.',
            })
      );
    } finally {
      setIsApproving(false);
    }
  }, [integration.integrationId, onApproveAndDeploy, reviewVersion]);

  const tableRows: ReviewTableRow[] = [
    { id: 'table-header', rowType: 'header' },
    ...((reviewDetails?.dataStreams ?? []).map((dataStream) => ({
      id: dataStream.dataStreamId,
      rowType: 'data',
      dataStream,
    })) as ReviewTableRow[]),
  ];

  const reviewTableColumns: Array<EuiBasicTableColumn<ReviewTableRow>> = [
    {
      name: '',
      width: '32px',
      render: (item: ReviewTableRow) => {
        if (item.rowType === 'header' || !item.dataStream) {
          return null;
        }
        const dataStream = item.dataStream;
        return (
          <EuiButtonIcon
            iconType="expand"
            aria-label={i18n.translate(
              'xpack.fleet.epmList.manageIntegrations.actions.reviewRowOpenFlyoutAriaLabel',
              { defaultMessage: 'Open data stream results flyout' }
            )}
            onClick={() => setSelectedDataStreamForFlyout(dataStream)}
          />
        );
      },
    },
    {
      name: '',
      field: 'dataStream',
      render: (dataStream: ReviewDataStream | undefined, item: ReviewTableRow) => {
        if (item.rowType === 'header') {
          return (
            <strong>
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.actions.reviewTableTitle"
                defaultMessage="Title"
              />
            </strong>
          );
        }
        if (!dataStream) {
          return null;
        }
        return (
          <EuiLink onClick={() => onEdit(integration.integrationId)}>{dataStream.title}</EuiLink>
        );
      },
    },
    {
      name: '',
      render: (item: ReviewTableRow) => {
        if (item.rowType === 'header') {
          return (
            <strong>
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.actions.reviewTableCollectionMethods"
                defaultMessage="Data collection methods"
              />
            </strong>
          );
        }
        if (!item.dataStream) {
          return null;
        }
        return (
          <DataCollectionMethodsCell
            inputTypes={item.dataStream.inputTypes}
            formatInputType={formatInputType}
          />
        );
      },
    },
  ];

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
      {showReviewModal && !selectedDataStreamForFlyout && (
        <EuiOverlayMask>
          <EuiModal
            onClose={closeReviewModal}
            style={{ minWidth: 760 }}
            aria-label={i18n.translate(
              'xpack.fleet.epmList.manageIntegrations.actions.reviewModalAriaLabel',
              { defaultMessage: 'Review and approve data streams dialog' }
            )}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <h2>
                  <FormattedMessage
                    id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalTitle"
                    defaultMessage="Review and approve data streams"
                  />
                </h2>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              {isLoadingReviewDetails ? (
                <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
              ) : (
                <>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalDescription"
                      defaultMessage="This integration contains {count} data stream(s). Click one to view and edit its field mappings."
                      values={{ count: reviewDetails?.dataStreams.length ?? 0 }}
                    />
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiText size="s">
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalDataStreamsHeading"
                        defaultMessage="Data Streams"
                      />
                    </strong>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiBasicTable
                    items={tableRows}
                    columns={reviewTableColumns}
                    itemId="id"
                    tableCaption={i18n.translate(
                      'xpack.fleet.epmList.manageIntegrations.actions.reviewModalTableCaption',
                      {
                        defaultMessage: 'Data streams available for approval',
                      }
                    )}
                  />
                  <EuiSpacer size="m" />
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalVersionLabel"
                        defaultMessage="Version"
                      />
                    }
                    isInvalid={isVersionInputInvalid}
                    error={isVersionInputInvalid ? versionValidationMessage : undefined}
                  >
                    <EuiFieldText
                      value={reviewVersion}
                      placeholder="1.0.0"
                      onChange={(event) => {
                        setReviewVersion(event.target.value);
                        if (!isVersionTouched) {
                          return;
                        }
                        setReviewError(null);
                      }}
                      onBlur={() => setIsVersionTouched(true)}
                      isInvalid={isVersionInputInvalid}
                    />
                  </EuiFormRow>
                </>
              )}
              {reviewError && (
                <>
                  <EuiSpacer size="m" />
                  <EuiText color="danger" size="s">
                    {reviewError}
                  </EuiText>
                </>
              )}
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty
                onClick={closeReviewModal}
                data-test-subj="manageIntegrationReviewModalCancel"
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalCancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              <EuiButton
                onClick={handleApproveAndDeploy}
                fill
                isLoading={isApproving}
                isDisabled={isLoadingReviewDetails || !isVersionValid}
                data-test-subj="manageIntegrationReviewApproveDeployButton"
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalApprove"
                  defaultMessage="Approve & deploy"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
      {DataStreamResultsFlyoutComponent && selectedDataStreamForFlyout && (
        <DataStreamResultsFlyoutComponent
          integrationId={integration.integrationId}
          dataStream={selectedDataStreamForFlyout}
          onClose={() => setSelectedDataStreamForFlyout(null)}
        />
      )}
    </>
  );
};
