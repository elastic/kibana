/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import semverValid from 'semver/functions/valid';

import { useGetCategoriesQuery, useStartServices } from '../../../../../hooks';

import type {
  AutomaticImportTelemetry,
  DataStreamResponse,
  DataStreamResultsFlyoutComponent,
} from './manage_integrations_table';

type ReviewDataStream = DataStreamResponse;

interface ReviewTableRow {
  id: string;
  dataStream: ReviewDataStream;
}

export interface ReviewIntegrationDetails {
  title: string;
  version?: string;
  dataStreams: ReviewDataStream[];
}

const MAX_VISIBLE_COLLECTION_METHODS = 1;

const formatInputType = (value: string): string => {
  const withSpaces = value.replace(/[_-]/g, ' ');
  return withSpaces.replace(/\b\w/g, (match) => match.toUpperCase());
};

const DataCollectionMethodsCell: React.FC<{
  inputTypes: Array<{ name: string }>;
}> = ({ inputTypes }) => {
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
            aria-label={i18n.translate(
              'xpack.fleet.epmList.manageIntegrations.actions.reviewCollectionMethodsExpandAriaLabel',
              { defaultMessage: 'Show all data collection methods' }
            )}
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

export const ReviewApproveModal: React.FC<{
  isOpen: boolean;
  integrationId: string;
  onClose: () => void;
  onEdit: (integrationId: string) => void;
  onFetchReviewDetails: (integrationId: string) => Promise<ReviewIntegrationDetails>;
  onApproveAndDeploy: (
    integrationId: string,
    version: string,
    categories: string[]
  ) => Promise<void>;
  DataStreamResultsFlyoutComponent?: DataStreamResultsFlyoutComponent;
}> = ({
  isOpen,
  integrationId,
  onClose,
  onEdit,
  onFetchReviewDetails,
  onApproveAndDeploy,
  DataStreamResultsFlyoutComponent,
}) => {
  const { automaticImport } = useStartServices();
  const [isLoadingReviewDetails, setIsLoadingReviewDetails] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewDetails, setReviewDetails] = useState<ReviewIntegrationDetails | null>(null);
  const [reviewVersion, setReviewVersion] = useState('');
  const [isVersionTouched, setIsVersionTouched] = useState(false);
  const [selectedDataStreamForFlyout, setSelectedDataStreamForFlyout] =
    useState<ReviewDataStream | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<EuiComboBoxOptionOption[]>([]);

  const { data: categoriesData } = useGetCategoriesQuery({ prerelease: false });
  const categoryOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      (categoriesData?.items ?? [])
        .filter((item) => item.parent_id === undefined)
        .map((item) => ({
          label: item.title,
          value: item.id,
        })),
    [categoriesData]
  );

  const hasAtLeastOneCategory = useMemo(
    () =>
      selectedCategories.some((opt) => {
        const value = opt.value;
        if (typeof value === 'string') {
          return value.length > 0;
        }
        return Boolean(value);
      }),
    [selectedCategories]
  );

  const loadReviewDetails = useCallback(async () => {
    setIsLoadingReviewDetails(true);
    setReviewError(null);
    try {
      const details = await onFetchReviewDetails(integrationId);
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
  }, [integrationId, onFetchReviewDetails]);

  useEffect(() => {
    if (isOpen) {
      setReviewDetails(null);
      setReviewVersion('');
      setIsVersionTouched(false);
      setReviewError(null);
      setSelectedDataStreamForFlyout(null);
      setSelectedCategories([]);
      loadReviewDetails();
    }
  }, [isOpen, loadReviewDetails]);

  const closeModal = useCallback(() => {
    if (isApproving) {
      return;
    }
    onClose();
  }, [isApproving, onClose]);

  const handleCancelClick = useCallback(() => {
    (automaticImport?.telemetry as AutomaticImportTelemetry)?.reportEvent(
      'automatic_import_approve_modal_cancel_clicked',
      {}
    );
    closeModal();
  }, [automaticImport, closeModal]);

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

    const categoryIds = selectedCategories.map((opt) => opt.value as string).filter(Boolean);
    if (categoryIds.length === 0) {
      setReviewError(
        i18n.translate(
          'xpack.fleet.epmList.manageIntegrations.actions.reviewCategoryRequiredError',
          {
            defaultMessage: 'Select at least one category before approving.',
          }
        )
      );
      return;
    }

    (automaticImport?.telemetry as AutomaticImportTelemetry)?.reportEvent(
      'automatic_import_approve_modal_approve_clicked',
      {}
    );
    setIsApproving(true);
    setReviewError(null);
    try {
      await onApproveAndDeploy(integrationId, version, categoryIds);
      onClose();
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
  }, [
    automaticImport,
    integrationId,
    onApproveAndDeploy,
    onClose,
    reviewVersion,
    selectedCategories,
  ]);

  const tableRows: ReviewTableRow[] = (reviewDetails?.dataStreams ?? []).map((dataStream) => ({
    id: dataStream.dataStreamId,
    dataStream,
  }));

  const reviewTableColumns: Array<EuiBasicTableColumn<ReviewTableRow>> = [
    {
      name: '',
      width: '32px',
      render: (item: ReviewTableRow) => (
        <EuiButtonIcon
          iconType="expand"
          aria-label={i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.reviewRowOpenFlyoutAriaLabel',
            { defaultMessage: 'Open data stream results flyout' }
          )}
          onClick={() => setSelectedDataStreamForFlyout(item.dataStream)}
        />
      ),
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.epmList.manageIntegrations.actions.reviewTableTitle"
          defaultMessage="Title"
        />
      ),
      render: (item: ReviewTableRow) => (
        <EuiLink onClick={() => onEdit(integrationId)}>{item.dataStream.title}</EuiLink>
      ),
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.epmList.manageIntegrations.actions.reviewTableCollectionMethods"
          defaultMessage="Data collection methods"
        />
      ),
      render: (item: ReviewTableRow) => (
        <DataCollectionMethodsCell inputTypes={item.dataStream.inputTypes} />
      ),
    },
  ];

  if (!isOpen) {
    return null;
  }

  if (DataStreamResultsFlyoutComponent && selectedDataStreamForFlyout) {
    return (
      <DataStreamResultsFlyoutComponent
        integrationId={integrationId}
        integrationName={reviewDetails?.title ?? ''}
        dataStream={selectedDataStreamForFlyout}
        onClose={() => setSelectedDataStreamForFlyout(null)}
      />
    );
  }

  return (
    <EuiModal
      onClose={closeModal}
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
            <EuiSpacer size="m" />
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalCategoryLabel"
                  defaultMessage="Category"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalCategoryHelp"
                  defaultMessage="Select at least one category."
                />
              }
            >
              <EuiComboBox
                data-test-subj="manageIntegrationReviewModalCategories"
                aria-label={i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.reviewModalCategoryAriaLabel',
                  { defaultMessage: 'Select categories' }
                )}
                placeholder={i18n.translate(
                  'xpack.fleet.epmList.manageIntegrations.actions.reviewModalCategoryPlaceholder',
                  { defaultMessage: 'Select categories' }
                )}
                selectedOptions={selectedCategories}
                options={categoryOptions}
                onChange={(options) => setSelectedCategories(options)}
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
          onClick={handleCancelClick}
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
          isDisabled={isLoadingReviewDetails || !isVersionValid || !hasAtLeastOneCategory}
          data-test-subj="manageIntegrationReviewApproveDeployButton"
        >
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.actions.reviewModalApprove"
            defaultMessage="Approve"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
