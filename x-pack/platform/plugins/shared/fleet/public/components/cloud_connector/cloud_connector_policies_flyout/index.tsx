/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiLink,
  EuiEmptyPrompt,
  EuiCopy,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiCallOut,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { pagePathGetters } from '../../../constants';
import type { CloudConnectorVars, AccountType } from '../../../../common/types';
import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import type { CloudProviders } from '../types';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useDeleteCloudConnector } from '../hooks/use_delete_cloud_connector';
import {
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
  isCloudConnectorNameValid,
} from '../utils';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { AccountBadge } from '../components/account_badge';

interface CloudConnectorPoliciesFlyoutProps {
  cloudConnectorId: string;
  cloudConnectorName: string;
  cloudConnectorVars: CloudConnectorVars;
  accountType?: AccountType;
  provider: CloudProviders;
  onClose: () => void;
}

export const CloudConnectorPoliciesFlyout: React.FC<CloudConnectorPoliciesFlyoutProps> = ({
  cloudConnectorId,
  cloudConnectorName: initialName,
  cloudConnectorVars,
  accountType,
  provider,
  onClose,
}) => {
  const { application } = useKibana().services;
  const flyoutTitleId = useGeneratedHtmlId();
  const deleteModalTitleId = useGeneratedHtmlId();
  const [cloudConnectorName, setCloudConnectorName] = useState(initialName);
  const [editedName, setEditedName] = useState(initialName);
  const [isNameValid, setIsNameValid] = useState(() => isCloudConnectorNameValid(initialName));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const {
    data: usageData,
    isLoading,
    error,
  } = useCloudConnectorUsage(
    cloudConnectorId,
    pageIndex + 1, // Convert from 0-based to 1-based
    pageSize
  );

  const usageItems = usageData?.items || [];
  const totalItemCount = usageData?.total || 0;

  const { mutate: updateConnector, isLoading: isUpdating } = useUpdateCloudConnector(
    cloudConnectorId,
    (updatedConnector) => {
      setCloudConnectorName(updatedConnector.name);
      setEditedName(updatedConnector.name);
      setIsNameValid(true);
    }
  );

  const { mutate: deleteConnector, isLoading: isDeleting } = useDeleteCloudConnector(
    cloudConnectorId,
    () => {
      onClose();
    }
  );

  const handleDeleteConnector = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteConnector({});
    setIsDeleteModalVisible(false);
  }, [deleteConnector]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  // Extract ARN or Subscription ID based on provider
  const identifier = useMemo(() => {
    if (isAwsCloudConnectorVars(cloudConnectorVars, provider)) {
      return cloudConnectorVars.role_arn?.value || '';
    } else if (isAzureCloudConnectorVars(cloudConnectorVars, provider)) {
      return cloudConnectorVars.azure_credentials_cloud_connector_id?.value || '';
    }
    return '';
  }, [cloudConnectorVars, provider]);

  const identifierLabel =
    provider === 'aws'
      ? i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.roleArnLabel', {
          defaultMessage: 'Role ARN',
        })
      : i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.cloudConnectorIdLabel', {
          defaultMessage: 'Cloud Connector ID',
        });

  const handleSaveName = () => {
    if (editedName && editedName !== cloudConnectorName) {
      updateConnector({ name: editedName });
    }
  };

  const handleNameChange = useCallback((name: string, valid: boolean) => {
    setEditedName(name);
    setIsNameValid(valid);
  }, []);

  const isSaveDisabled = !isNameValid || editedName === cloudConnectorName || isUpdating;

  const tableCaption = useMemo(
    () =>
      i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.tableCaption', {
        defaultMessage: 'Integrations using cloud connector {name}',
        values: { name: cloudConnectorName },
      }),
    [cloudConnectorName]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 50],
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const onTableChange = useCallback(({ page }: { page?: { index: number; size: number } }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const handleNavigateToPolicy = useCallback(
    (packagePolicyId: string) => {
      // Use integrations app route to ensure cancel navigates back to integrations page
      const [, path] = pagePathGetters.integration_policy_edit({ packagePolicyId });
      application?.navigateToApp('integrations', { path });
    },
    [application]
  );

  const columns: Array<EuiBasicTableColumn<(typeof usageItems)[0]>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.nameColumn', {
          defaultMessage: 'Name',
        }),
        render: (name: string, item) => {
          return (
            <EuiLink
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleNavigateToPolicy(item.id);
              }}
              data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICY_LINK}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'package',
        name: i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.integrationTypeColumn', {
          defaultMessage: 'Integration Type',
        }),
        render: (pkg: (typeof usageItems)[0]['package']) => pkg?.title || pkg?.name || '-',
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.createdColumn', {
          defaultMessage: 'Created',
        }),
        render: (createdAt: string) => new Date(createdAt).toLocaleDateString(),
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.lastUpdatedColumn', {
          defaultMessage: 'Last Updated',
        }),
        render: (updatedAt: string) => new Date(updatedAt).toLocaleDateString(),
      },
    ],
    [handleNavigateToPolicy]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={flyoutTitleId}
      data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FLYOUT}
    >
      <EuiFlyoutHeader hasBorder={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2
                id={flyoutTitleId}
                data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.TITLE}
              >
                {cloudConnectorName}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AccountBadge accountType={accountType} variant="flyout" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT}
            >
              {identifierLabel}
              {': '}
              {identifier}
            </EuiText>
          </EuiFlexItem>
          {identifier && (
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={identifier}>
                {(copy) => (
                  <EuiButtonIcon
                    onClick={copy}
                    iconType="copy"
                    aria-label={i18n.translate(
                      'xpack.fleet.cloudConnector.policiesFlyout.copyIdentifier',
                      {
                        defaultMessage: 'Copy {label}',
                        values: { label: identifierLabel },
                      }
                    )}
                    size="xs"
                    data-test-subj={
                      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.COPY_IDENTIFIER_BUTTON
                    }
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Edit Name Section */}
        <CloudConnectorNameField
          value={editedName}
          onChange={handleNameChange}
          data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT}
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Usage Section */}
        <EuiText
          size="xs"
          data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.USAGE_COUNT_TEXT}
        >
          <h4>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.usedByTitle"
              defaultMessage="Used by {count} {count, plural, one {integration} other {integrations}}"
              values={{ count: totalItemCount }}
            />
          </h4>
        </EuiText>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" style={{ height: 2 }} />
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h3>
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.policiesFlyout.errorTitle"
                  defaultMessage="Failed to load policies"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.policiesFlyout.errorBody"
                  defaultMessage="There was an error loading the policies using this cloud connector. Please try again."
                />
              </p>
            }
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.ERROR_STATE}
          />
        ) : isLoading ? (
          <EuiBasicTable
            items={[]}
            columns={columns}
            loading={true}
            pagination={pagination}
            onChange={onTableChange}
            tableCaption={tableCaption}
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE}
          />
        ) : usageItems.length === 0 ? (
          <EuiEmptyPrompt
            iconType="inspect"
            title={
              <h3>
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.policiesFlyout.emptyStateTitle"
                  defaultMessage="No integrations using this cloud connector"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.policiesFlyout.emptyStateBody"
                  defaultMessage="This cloud connector is not currently used by any integrations."
                />
              </p>
            }
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.EMPTY_STATE}
          />
        ) : (
          <EuiBasicTable
            items={usageItems}
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            tableCaption={tableCaption}
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.CLOSE_BUTTON}
            >
              <FormattedMessage
                id="xpack.fleet.cloudConnector.cloudConnectorPoliciesFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    totalItemCount > 0
                      ? i18n.translate(
                          'xpack.fleet.cloudConnector.policiesFlyout.deleteDisabledTooltip',
                          {
                            defaultMessage:
                              "This action isn't available because this connector is used by other integrations. To delete the connector, replace it in all other integrations",
                          }
                        )
                      : undefined
                  }
                >
                  <EuiButtonEmpty
                    color="danger"
                    iconType="trash"
                    isDisabled={totalItemCount > 0}
                    isLoading={isDeleting}
                    onClick={handleDeleteConnector}
                    data-test-subj={
                      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONNECTOR_BUTTON
                    }
                  >
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.policiesFlyout.deleteConnectorButton"
                      defaultMessage="Delete Connector"
                    />
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleSaveName}
                  isDisabled={isSaveDisabled}
                  iconType="save"
                  isLoading={isUpdating}
                  fill
                  data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.FOOTER_SAVE_BUTTON}
                >
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.policiesFlyout.footerSaveButton"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {isDeleteModalVisible && (
        <EuiConfirmModal
          title={i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.deleteModalTitle', {
            defaultMessage: "You're about to delete a connector",
          })}
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.fleet.cloudConnector.policiesFlyout.deleteModalCancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.fleet.cloudConnector.policiesFlyout.deleteModalConfirm',
            {
              defaultMessage: 'Delete connector',
            }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
          data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONFIRM_MODAL}
        >
          <EuiCallOut
            color="danger"
            announceOnMount={false}
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_MODAL_CALLOUT}
          >
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.deleteModalCallout"
              defaultMessage="Deleting {connectorName} will stop data ingestion and it cannot be re-used in other integrations."
              values={{
                connectorName: <strong>{cloudConnectorName}</strong>,
              }}
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.deleteModalBody"
              defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
            />
          </EuiText>
        </EuiConfirmModal>
      )}
    </EuiFlyout>
  );
};
