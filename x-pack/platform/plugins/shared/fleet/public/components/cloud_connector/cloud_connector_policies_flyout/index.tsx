/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { pagePathGetters } from '../../../constants';
import type {
  CloudConnectorVar,
  CloudConnectorVars,
  AccountType,
  GcpCloudConnectorVars,
  IacUpgradeStatus,
} from '../../../../common/types';
import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import { parseAwsRegionFromArn } from '../../../../common/services/cloud_connectors/iac_deployment';
import { IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT } from '../../../../common/telemetry/iac_provisioner_events';
import type { CloudProviders } from '../types';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector, updateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useDeleteCloudConnector } from '../hooks/use_delete_cloud_connector';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { GCP_CLOUD_CONNECTOR_FIELD_NAMES, AWS_PROVIDER } from '../constants';
import {
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
  isCloudConnectorNameValid,
  isGcpCloudConnectorVars,
} from '../utils';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { AccountBadge } from '../components/account_badge';
import { IacTemplateDetails } from '../components/iac_template_details';
import { IacUpgradeCallout } from '../components/iac_upgrade_callout';
import { useIacProvisioner, useStartServices } from '../../../hooks';

interface CloudConnectorPoliciesFlyoutProps {
  cloudConnectorId: string;
  cloudConnectorName: string;
  cloudConnectorVars: CloudConnectorVars;
  accountType?: AccountType;
  provider: CloudProviders;
  onClose: () => void;
  iacKey?: string;
  iacDeploymentId?: string;
  iacUpgradeStatus?: IacUpgradeStatus;
  iacUpgradeCheckedAt?: string;
}

export const CloudConnectorPoliciesFlyout: React.FC<CloudConnectorPoliciesFlyoutProps> = ({
  cloudConnectorId,
  cloudConnectorName: initialName,
  cloudConnectorVars,
  accountType,
  provider,
  onClose,
  iacKey,
  iacDeploymentId,
  iacUpgradeStatus,
  iacUpgradeCheckedAt,
}) => {
  const { application } = useKibana().services;
  const { analytics, http } = useStartServices();
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const queryClient = useQueryClient();

  const flyoutTitleId = useGeneratedHtmlId();
  const deleteModalTitleId = useGeneratedHtmlId();
  const [cloudConnectorName, setCloudConnectorName] = useState(initialName);
  const [editedName, setEditedName] = useState(initialName);
  const [isNameValid, setIsNameValid] = useState(() => isCloudConnectorNameValid(initialName));
  const [editedIacKey, setEditedIacKey] = useState(iacKey ?? '');
  const [editedIacDeploymentId, setEditedIacDeploymentId] = useState(iacDeploymentId ?? '');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const showIac = provider === AWS_PROVIDER && isIacProvisionerEnabled;

  const deploymentIdInvalid =
    editedIacDeploymentId !== '' && parseAwsRegionFromArn(editedIacDeploymentId) === undefined;
  const iacDeploymentIdToSave =
    showIac && editedIacDeploymentId && editedIacDeploymentId !== (iacDeploymentId ?? '')
      ? editedIacDeploymentId
      : undefined;

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

  const {
    data: verification,
    isFetching: isVerifying,
    refetch: refetchVerification,
  } = useVerifyIacKey({
    cloudConnectorId,
    enabled: showIac && iacUpgradeStatus === 'upgrade_available',
  });

  const handleVerify = useCallback(async () => {
    analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
      surface: 'flyout',
      action: 'verify_clicked',
      reason: iacKey ? 'key_mismatch' : 'no_key',
      hasDeploymentId: Boolean(editedIacDeploymentId),
    });
    // Invalidated here as well as in the effect below: an unchanged verdict comes back as the
    // same object (React Query keeps the old reference for deep-equal data), so the effect would
    // not fire and the callout's "Checked" line would still show the previous run.
    await refetchVerification();
    queryClient.invalidateQueries(['get-cloud-connectors']);
    queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
  }, [
    analytics,
    cloudConnectorId,
    editedIacDeploymentId,
    iacKey,
    queryClient,
    refetchVerification,
  ]);

  // Opening the flyout runs the check on its own, and the server stores the status it derives.
  // Nothing else re-reads that, so any arriving verdict refreshes the queries that carry it.
  useEffect(() => {
    if (!verification) {
      return;
    }
    queryClient.invalidateQueries(['get-cloud-connectors']);
    queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
  }, [verification, queryClient, cloudConnectorId]);

  const onTemplateRendered = useCallback(
    ({ key }: { key?: string }) => {
      // Runs on the "Update CloudFormation stack" click once the render succeeds; Kibana cannot see
      // the user apply the update in AWS, so the key is stored at click time. Raw request: no toast.
      if (key && cloudConnectorId) {
        updateCloudConnector(http, cloudConnectorId, {
          iac_key: key,
          ...(iacDeploymentIdToSave ? { iac_deployment_id: iacDeploymentIdToSave } : {}),
        })
          .then(() => {
            setEditedIacKey(key);
            queryClient.invalidateQueries(['get-cloud-connectors']);
            queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
          })
          .catch(() => {
            // Silent: the daily iac_upgrade_check task self-heals key mismatches.
          });
      }
    },
    [cloudConnectorId, http, iacDeploymentIdToSave, queryClient]
  );

  const { launchButtonProps, isGeneratingTemplate, templateGenerationError } =
    useCloudConnectorTemplate({
      provider: AWS_PROVIDER,
      accountType: accountType ?? 'single-account',
      integrations: verification?.integrations,
      deploymentId: deploymentIdInvalid ? undefined : editedIacDeploymentId || undefined,
      // This identity already has a generated template; sending the user to the static one
      // would downgrade it (https://github.com/elastic/ingest-dev/issues/9415).
      staticTemplateFallback: false,
      onTemplateRendered,
    });

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
    }
    if (isAzureCloudConnectorVars(cloudConnectorVars, provider)) {
      return cloudConnectorVars.azure_credentials_cloud_connector_id?.value || '';
    }
    if (isGcpCloudConnectorVars(cloudConnectorVars, provider)) {
      const gcpVars = cloudConnectorVars as GcpCloudConnectorVars & {
        [GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT]?: CloudConnectorVar;
      };
      return (
        gcpVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT]?.value ||
        gcpVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT]?.value ||
        ''
      );
    }
    return '';
  }, [cloudConnectorVars, provider]);

  const identifierLabel =
    provider === 'aws'
      ? i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.roleArnLabel', {
          defaultMessage: 'Role ARN',
        })
      : provider === 'gcp'
      ? i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.gcpServiceAccountEmailLabel', {
          defaultMessage: 'Service Account Email',
        })
      : i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.cloudConnectorIdLabel', {
          defaultMessage: 'Federated Identity ID',
        });

  const copyIdentifierLabel = i18n.translate(
    'xpack.fleet.cloudConnector.policiesFlyout.copyIdentifier',
    {
      defaultMessage: 'Copy {label}',
      values: { label: identifierLabel },
    }
  );

  const handleNameChange = useCallback((name: string, valid: boolean) => {
    setEditedName(name);
    setIsNameValid(valid);
  }, []);

  // The API rejects empty strings (minLength 1): clearing a value is not supported, so only
  // non-empty, changed values are sent.
  const iacKeyToSave =
    showIac && editedIacKey && editedIacKey !== (iacKey ?? '') ? editedIacKey : undefined;
  const iacChanged = iacKeyToSave !== undefined || iacDeploymentIdToSave !== undefined;
  const nameChanged = editedName !== cloudConnectorName;

  const handleSave = () => {
    updateConnector({
      ...(nameChanged && editedName ? { name: editedName } : {}),
      ...(iacKeyToSave !== undefined ? { iac_key: iacKeyToSave } : {}),
      ...(iacDeploymentIdToSave !== undefined ? { iac_deployment_id: iacDeploymentIdToSave } : {}),
    });
  };

  const isSaveDisabled =
    !isNameValid || deploymentIdInvalid || (!nameChanged && !iacChanged) || isUpdating;

  const tableCaption = useMemo(
    () =>
      i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.tableCaption', {
        defaultMessage: 'Integrations using federated identity {name}',
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
                  <EuiToolTip content={copyIdentifierLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copy"
                      aria-label={copyIdentifierLabel}
                      size="xs"
                      data-test-subj={
                        CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.COPY_IDENTIFIER_BUTTON
                      }
                    />
                  </EuiToolTip>
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
        {/* The stored status can be up to a day old; a definite live verdict of "current" hides the
            callout right away, without waiting for the connector list to be re-read. `matches`
            alone is not enough: it is also true when the check could not run (fail open), and the
            stored status must stand then. */}
        {showIac &&
          iacUpgradeStatus === 'upgrade_available' &&
          verification?.outcome !== 'matches' && (
            <>
              <IacUpgradeCallout
                checkedAt={iacUpgradeCheckedAt}
                hasKey={Boolean(iacKey)}
                canUpdate={
                  Boolean(editedIacDeploymentId) &&
                  !deploymentIdInvalid &&
                  Boolean(verification?.integrations?.length)
                }
                isUpdating={isGeneratingTemplate}
                onUpdateStack={() => {
                  analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
                    surface: 'flyout',
                    action: 'update_stack_clicked',
                    reason: iacKey ? 'key_mismatch' : 'no_key',
                    hasDeploymentId: Boolean(editedIacDeploymentId),
                  });
                  if ('onClick' in launchButtonProps) {
                    launchButtonProps.onClick();
                  }
                }}
                onVerify={handleVerify}
                isVerifying={isVerifying}
              />
              {templateGenerationError && (
                <>
                  <EuiSpacer size="m" />
                  <KbnDangerCallout
                    announceOnMount
                    data-test-subj={
                      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
                    }
                    title={templateGenerationError}
                    size="s"
                  />
                </>
              )}
              <EuiSpacer size="m" />
            </>
          )}
        {showIac && (
          <>
            <IacTemplateDetails
              iacKey={editedIacKey}
              iacDeploymentId={editedIacDeploymentId}
              isDeploymentIdInvalid={deploymentIdInvalid}
              onIacKeyChange={setEditedIacKey}
              onIacDeploymentIdChange={setEditedIacDeploymentId}
            />
            <EuiSpacer size="m" />
          </>
        )}

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
                  defaultMessage="There was an error loading the policies using this federated identity. Please try again."
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
                  defaultMessage="No integrations using this federated identity"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.policiesFlyout.emptyStateBody"
                  defaultMessage="This federated identity is not currently used by any integrations."
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
                              "This action isn't available because this identity is used by other integrations. To delete the identity, replace it in all other integrations",
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
                      defaultMessage="Delete Identity"
                    />
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleSave}
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
            defaultMessage: "You're about to delete a federated identity",
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
              defaultMessage: 'Delete identity',
            }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
          data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_CONFIRM_MODAL}
        >
          <KbnDangerCallout
            announceOnMount={false}
            data-test-subj={CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.DELETE_MODAL_CALLOUT}
            title={i18n.translate(
              'xpack.fleet.cloudConnector.policiesFlyout.deleteModalCalloutTitle',
              {
                defaultMessage: 'Deleting this identity will stop data ingestion',
              }
            )}
            text={
              <FormattedMessage
                id="xpack.fleet.cloudConnector.policiesFlyout.deleteModalCallout"
                defaultMessage="Deleting {connectorName} will stop data ingestion and it cannot be re-used in other integrations."
                values={{
                  connectorName: <strong>{cloudConnectorName}</strong>,
                }}
              />
            }
          />
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
