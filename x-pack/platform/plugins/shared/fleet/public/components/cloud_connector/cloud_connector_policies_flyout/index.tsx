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
import {
  IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT,
  type IacKeyCheckAction,
} from '../../../../common/telemetry/iac_provisioner_events';
import type { CloudProviders } from '../types';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector, updateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useDeleteCloudConnector } from '../hooks/use_delete_cloud_connector';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/cloud_connector';
import {
  useCloudConnectorTemplate,
  type TemplateRendered,
} from '../hooks/use_cloud_connector_template';
import { GCP_CLOUD_CONNECTOR_FIELD_NAMES, AWS_PROVIDER } from '../constants';
import {
  getAnyCloudConnectorIacTemplateUrl,
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
  isCloudConnectorNameValid,
  isGcpCloudConnectorVars,
  isStackArnInvalid,
} from '../utils';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { AccountBadge } from '../components/account_badge';
import { IacTemplateDetails } from '../components/iac_template_details';
import { IacUpgradeCallout } from '../components/iac_upgrade_callout';
import { LaunchCloudFormationButton } from '../components/launch_cloud_formation_button';
import { useGetPackageInfoByKeyQuery, useIacProvisioner, useStartServices } from '../../../hooks';

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
  const { analytics, http, cloud, notifications } = useStartServices();
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const queryClient = useQueryClient();

  const flyoutTitleId = useGeneratedHtmlId();
  const deleteModalTitleId = useGeneratedHtmlId();
  const [cloudConnectorName, setCloudConnectorName] = useState(initialName);
  const [editedName, setEditedName] = useState(initialName);
  const [isNameValid, setIsNameValid] = useState(() => isCloudConnectorNameValid(initialName));
  const [editedIacDeploymentId, setEditedIacDeploymentId] = useState(iacDeploymentId ?? '');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const showIac = provider === AWS_PROVIDER && isIacProvisionerEnabled;

  // IacTemplateDetails trims on input, so the value judged here is the value that gets saved.
  const deploymentIdInvalid = isStackArnInvalid(editedIacDeploymentId);
  // Never a malformed ARN: Launch is offered exactly while the field is invalid, and its render
  // writes this alongside the key.
  const iacDeploymentIdToSave =
    showIac &&
    editedIacDeploymentId &&
    !deploymentIdInvalid &&
    editedIacDeploymentId !== (iacDeploymentId ?? '')
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

  // A read of the connector's integration set (compare: false): Update and Redeploy render
  // exactly this set. No IaCP comparison and no status write on open — the daily task is the only
  // thing that discovers upgrades and stamps the check time; the flyout displays and acts.
  const { data: verification } = useVerifyIacKey({
    cloudConnectorId,
    compare: false,
    enabled: showIac,
  });

  const onTemplateRendered = useCallback(
    ({ key, blueprintId, blueprintVersion }: TemplateRendered) => {
      // Runs on the Update / Redeploy / Launch click once the console has opened; Kibana cannot
      // see the user apply the update in AWS, so the key and its blueprint details are stored
      // at click time (idempotent when unchanged). One comparing re-check follows: with the new
      // key stored it answers `matches` and the server persists `up_to_date`, and the
      // invalidations re-read the stored status that drives the callout, so it clears itself
      // without a second click.
      // A failed write is surfaced: without the new key the callout would stay until the daily
      // task runs again and the user would not know why; there is nothing to re-check then.
      if (key && cloudConnectorId) {
        updateCloudConnector(http, cloudConnectorId, {
          iac_key: key,
          iac_blueprint_id: blueprintId,
          iac_blueprint_version: blueprintVersion,
          ...(iacDeploymentIdToSave ? { iac_deployment_id: iacDeploymentIdToSave } : {}),
        }).then(
          async () => {
            // Best effort: sendRequest never rejects, it answers { error }, which is ignored here
            // on purpose — the daily task re-derives the status if this re-check fails.
            await sendVerifyCloudConnectorIacKey(cloudConnectorId, {});
            queryClient.invalidateQueries(['get-cloud-connectors']);
            queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
          },
          () => {
            notifications.toasts.addWarning({
              title: i18n.translate(
                'xpack.fleet.cloudConnector.policiesFlyout.templateWriteFailed.title',
                { defaultMessage: 'Template details were not saved on the identity' }
              ),
              text: i18n.translate(
                'xpack.fleet.cloudConnector.policiesFlyout.templateWriteFailed.text',
                {
                  defaultMessage:
                    'Kibana could not record the new template for this identity, so the upgrade callout will stay until the daily check runs again. Try Update again.',
                }
              ),
            });
          }
        );
      }
    },
    [cloudConnectorId, http, iacDeploymentIdToSave, notifications, queryClient]
  );

  // Without a stack ARN the hook lands the rendered template on the package's quick-create
  // console URL (create stack) instead of the update-stack deep link; that scaffold needs the aws
  // package's iac_template_url and the cloud context, as the onboarding provides them.
  const { data: awsPackageResponse } = useGetPackageInfoByKeyQuery(
    'aws',
    undefined,
    { full: true },
    // The template URL only changes on a package upgrade; do not hit EPR on every flyout open.
    { enabled: showIac, staleTime: 5 * 60 * 1000 }
  );
  const iacTemplateUrl = useMemo(
    () => getAnyCloudConnectorIacTemplateUrl(awsPackageResponse?.item),
    [awsPackageResponse]
  );

  const {
    launchButtonProps,
    isDisabled: isLaunchDisabled,
    isGeneratingTemplate,
    templateGenerationError,
  } = useCloudConnectorTemplate({
    provider: AWS_PROVIDER,
    cloud,
    accountType: accountType ?? 'single-account',
    iacTemplateUrl,
    integrations: verification?.integrations,
    deploymentId: deploymentIdInvalid ? undefined : editedIacDeploymentId || undefined,
    // This identity already has a generated template; sending the user to the static one
    // would downgrade it.
    staticTemplateFallback: false,
    onTemplateRendered,
  });

  const hasRenderableIntegrations = Boolean(verification?.integrations?.length);
  const hasValidDeploymentId = Boolean(editedIacDeploymentId) && !deploymentIdInvalid;

  const launchTemplate = useCallback(
    (action: IacKeyCheckAction) => {
      analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
        surface: 'flyout',
        action,
        reason: iacKey ? 'key_mismatch' : 'no_key',
        hasDeploymentId: hasValidDeploymentId,
      });
      if ('onClick' in launchButtonProps) {
        launchButtonProps.onClick();
      }
    },
    [analytics, hasValidDeploymentId, iacKey, launchButtonProps]
  );

  // The stored status alone drives the callout: nothing in the flyout compares templates, and
  // the re-check after Update refreshes the status through the connector queries.
  const showUpgradeCallout = showIac && iacUpgradeStatus === 'upgrade_available';
  // Redeploy is a forced render for identities whose stack is current as far as Kibana knows,
  // for when the stack was not deployed or updated when the user was asked to. Offered to
  // keyless connectors too, but not alongside the upgrade callout, whose Update is the action
  // then.
  const showRedeploy =
    showIac && !showUpgradeCallout && hasRenderableIntegrations && hasValidDeploymentId;
  // With no stack ARN on record (legacy identity, or an ARN never saved) there is no stack to
  // update: Launch creates one from the current template, which also moves the identity onto the
  // generated template once the render writes its key. Offered alongside the upgrade callout
  // too: the daily task flags every keyless legacy identity as upgrade available, and the
  // callout's Update needs an ARN, so without Launch those identities would have no way forward.
  const showLaunch = showIac && hasRenderableIntegrations && !hasValidDeploymentId;
  // With the provisioner on the hook never disables the button, but the quick-create landing
  // still needs the scaffold only `cloud` and the package template URL provide.
  const isLaunchUnavailable = isLaunchDisabled || !cloud || !iacTemplateUrl;

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

  // The API rejects empty strings (minLength 1): clearing a value is not supported, so only a
  // non-empty, changed value is sent. The template key is never edited by hand: it is written
  // when a template is rendered for this identity (Update click) and by the daily check.
  const iacChanged = iacDeploymentIdToSave !== undefined;
  const nameChanged = editedName !== cloudConnectorName;

  const handleSave = () => {
    updateConnector({
      ...(nameChanged && editedName ? { name: editedName } : {}),
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
        {showIac && (
          <>
            <IacTemplateDetails
              iacDeploymentId={editedIacDeploymentId}
              isDeploymentIdInvalid={deploymentIdInvalid}
              onIacDeploymentIdChange={setEditedIacDeploymentId}
              // One stack action at a time: the upgrade callout's Update while an update is
              // pending and a stack ARN is on record; Redeploy with an ARN and no update pending;
              // Launch without an ARN, under the callout if one shows. The render error follows
              // whichever is shown.
              actions={
                showUpgradeCallout || showRedeploy || showLaunch ? (
                  <>
                    {showUpgradeCallout && (
                      <IacUpgradeCallout
                        checkedAt={iacUpgradeCheckedAt}
                        canUpdate={hasValidDeploymentId && hasRenderableIntegrations}
                        isUpdating={isGeneratingTemplate}
                        onUpdateStack={() => launchTemplate('update_stack_clicked')}
                      />
                    )}
                    {showUpgradeCallout && showLaunch && <EuiSpacer size="s" />}
                    {showLaunch ? (
                      <>
                        <LaunchCloudFormationButton
                          // showIac implies the provisioner is on, so the hook always launches
                          // through onClick here; the telemetry wrapper is the only addition.
                          launchButtonProps={{
                            onClick: async () => launchTemplate('launch_clicked'),
                          }}
                          isLoading={isGeneratingTemplate}
                          isDisabled={isLaunchUnavailable}
                          data-test-subj={
                            CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_LAUNCH_BUTTON
                          }
                          errorCalloutTestSubj={
                            CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_TEMPLATE_ERROR_CALLOUT
                          }
                        />
                        <EuiSpacer size="xs" />
                        <EuiText size="xs" color="subdued">
                          <p>
                            <FormattedMessage
                              id="xpack.fleet.cloudConnector.policiesFlyout.launchHelp"
                              defaultMessage="This identity has no CloudFormation stack on record: it predates generated templates or its stack ARN was never saved. If the stack already exists, paste its StackId below and save, then update it from here. Otherwise Launch creates a stack from the current template; paste the new stack's StackId below and save."
                            />
                          </p>
                        </EuiText>
                      </>
                    ) : showRedeploy ? (
                      <>
                        <EuiButton
                          size="s"
                          iconType="rocket"
                          isLoading={isGeneratingTemplate}
                          onClick={() => launchTemplate('redeploy_clicked')}
                          data-test-subj={
                            CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_REDEPLOY_BUTTON
                          }
                        >
                          <FormattedMessage
                            id="xpack.fleet.cloudConnector.policiesFlyout.redeployButton"
                            defaultMessage="Redeploy CloudFormation stack"
                          />
                        </EuiButton>
                        <EuiSpacer size="xs" />
                        <EuiText size="xs" color="subdued">
                          <p>
                            <FormattedMessage
                              id="xpack.fleet.cloudConnector.policiesFlyout.redeployHelp"
                              defaultMessage="Opens the AWS console with a freshly generated template for this identity's integrations. Use it if the stack was not deployed or updated when you were asked to."
                            />
                          </p>
                        </EuiText>
                      </>
                    ) : null}
                    {templateGenerationError && (
                      <>
                        <EuiSpacer size="s" />
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
                  </>
                ) : undefined
              }
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
