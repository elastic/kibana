/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CloudSetupForCloudConnector } from '../types';

import type { AccountType } from '../../../types';
import { useIacProvisioner } from '../../../hooks';
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../../../common/types/rest_spec/iac_provisioner';
import { hasPendingIacConfirm } from '../../../hooks/use_request/pending_cloud_connector_iac';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { CloudConnectorTabs, type CloudConnectorTab } from '../cloud_connector_tabs';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { CloudFormationCloudCredentialsGuide } from '../aws_cloud_connector/aws_cloud_formation_guide';
import {
  IacKeyCheck,
  type IacRenderedTemplate,
  type IacTemplateLaunchedFor,
} from '../components/iac_key_check';
import { LaunchCloudFormationButton } from '../components/launch_cloud_formation_button';
import { StackArnField } from '../components/stack_arn_field';
import { getCloudConnectorNameError, isStackArnInvalid } from '../utils';
import { TABS } from '../constants';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';

export interface AwsIdentityFederationSetupProps {
  accountType?: AccountType;
  packageName?: string;
  cloud?: CloudSetupForCloudConnector;
  iacTemplateUrl?: string;
  hasInvalidRequiredVars?: boolean;
  isEditPage?: boolean;
  initialConnectorId?: string;
  /** Policy templates of `packageName` to render for; ignored when `integrations` is given. */
  policyTemplates?: IacPolicyTemplateSelection[];
  /**
   * Integrations this identity must cover: one entry per package with the policy templates and
   * input types the user enabled. When given, the New Identity tab renders the template live and
   * stores the returned key and stack ARN on the connector, and the Existing Identity tab checks
   * the selected identity's deployed template against this set.
   * Omit to keep the static-template flow.
   * Callers must remount this component when the set changes; it is not re-rendered against a
   * new set.
   */
  integrations?: RenderIacTemplateIntegration[];
  onReadyChange?: (isReady: boolean) => void;
  onConnectorIdChange?: (connectorId: string | undefined, connectorName?: string) => void;
  /**
   * Existing Identity only. When given, the stack-update launch does not write the rendered key
   * to the connector; the template details are handed here instead, with the identity and the
   * integration set they were rendered for, for the host to store once its own flow succeeds
   * (the onboarding writes them after Deploy). Readiness still lifts on the launch.
   */
  onIacTemplateRecorded?: (iac: IacRenderedTemplate, launchedFor: IacTemplateLaunchedFor) => void;
}

export const AwsIdentityFederationSetup: React.FC<AwsIdentityFederationSetupProps> = ({
  accountType = 'single-account',
  packageName,
  cloud,
  iacTemplateUrl,
  hasInvalidRequiredVars = false,
  isEditPage = false,
  initialConnectorId,
  policyTemplates,
  integrations,
  onReadyChange,
  onConnectorIdChange,
  onIacTemplateRecorded,
}) => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { data: cloudConnectors = [], isLoading: isLoadingConnectors } = useGetCloudConnectors({
    cloudProvider: 'aws',
    accountType,
    packageName,
  });

  const [selectedTabId, setSelectedTabId] = useState<string>(TABS.NEW_CONNECTION);
  const [roleArn, setRoleArn] = useState('');
  const [connectorName, setConnectorName] = useState('');
  const [selected, setSelected] = useState<{ id: string; name?: string } | undefined>(
    initialConnectorId ? { id: initialConnectorId } : undefined
  );
  const [stackArn, setStackArn] = useState('');
  // IacKeyCheck reports false while the selected identity's deployed template is out of date,
  // and while its first verdict is pending. Readiness therefore starts pessimistic exactly when
  // a check will run (same condition IacKeyCheck uses), so Deploy cannot be pressed during the
  // verify round-trip; with no check coming, nothing would ever flip it back to true.
  const willRunIacCheck = isIacProvisionerEnabled && (integrations?.length ?? 0) > 0;
  // Stable identity of the set, for the check key below.
  const integrationsKey = useMemo(() => JSON.stringify(integrations ?? []), [integrations]);
  const initialCheckValidity = !willRunIacCheck;
  // A verdict belongs to the identity AND integration set it was computed for. IacKeyCheck is
  // remounted on this key and says nothing until its new verdict lands, so the parent must not
  // carry the previous combination's "valid" across the change: a set widened after Launch, or a
  // newly selected identity, would otherwise leave Deploy enabled for the whole re-check.
  // Storing the verdict with its key (rather than resetting in an effect) keeps it correct in the
  // same render the key changes, and survives the remounted check reporting from a mount effect
  // that runs before any parent effect.
  const checkKey = `${selected?.id ?? ''}|${integrationsKey}`;
  const [checkVerdict, setCheckVerdict] = useState<{ key: string; isValid: boolean }>();
  const isCheckValid = checkVerdict?.key === checkKey ? checkVerdict.isValid : initialCheckValidity;
  const handleCheckValidityChange = useCallback(
    (isValid: boolean) => setCheckVerdict({ key: checkKey, isValid }),
    [checkKey]
  );
  // Validate what Create will post: a pasted ARN often carries surrounding whitespace.
  const trimmedStackArn = stackArn.trim();
  const stackArnInvalid = isStackArnInvalid(stackArn);

  const hasSetInitialTab = useRef(false);
  useEffect(() => {
    if (hasSetInitialTab.current) return;
    if (isEditPage) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      hasSetInitialTab.current = true;
    } else if (cloudConnectors.length > 0) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      hasSetInitialTab.current = true;
    }
  }, [cloudConnectors.length, isEditPage]);

  // When opening an edit page with an initialConnectorId the name isn't available yet — resolve
  // it from the connector list once loaded, without overwriting a name already set by a user action.
  useEffect(() => {
    if (!selected?.id || selected.name) return;
    const match = cloudConnectors.find((c) => c.id === selected.id);
    if (match) setSelected({ id: match.id, name: match.name });
  }, [cloudConnectors, selected]);

  // A selection made in this component always carries its name, so an id without a name can only
  // be the initialConnectorId seed whose name is still being resolved above. Hold the emission
  // until it lands, otherwise consumers persist an id with no name and render an empty summary.
  const isAwaitingInitialName = !!selected?.id && !selected.name && isLoadingConnectors;

  useEffect(() => {
    onReadyChange?.(!!selected?.id && isCheckValid);
    if (isAwaitingInitialName) return;
    onConnectorIdChange?.(selected?.id, selected?.name);
  }, [selected, isCheckValid, isAwaitingInitialName, onReadyChange, onConnectorIdChange]);

  // `iacConfirm` is the template details of the last launch (key + blueprint from the render, or nulls
  // after a static-template fallback); Create stores it as iac_key / iac_blueprint_* so the
  // upgrade check can later compare the deployed template against what the identity's
  // integrations need.
  // No stale-render guard here: see the `integrations` prop contract.
  // The hook's `templateAlreadyCurrent` is not consumed: it only fires when a stored digest is
  // sent, and New Identity never has one.
  const {
    launchButtonProps,
    isDisabled: isLaunchDisabled,
    isGeneratingTemplate,
    templateGenerationError,
    iacConfirm,
    clearIacConfirm,
  } = useCloudConnectorTemplate({
    provider: 'aws',
    cloud,
    accountType,
    iacTemplateUrl,
    packageName,
    policyTemplates,
    // undefined → static template: a plain href with the provisioner off, the hook's
    // missing-context fallback (window.open + fallback telemetry) with it on.
    integrations,
  });

  const { mutate: createConnector, isLoading: isCreating } = useCreateCloudConnector(
    (connector) => {
      setSelected({ id: connector.id, name: connector.name });
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      setRoleArn('');
      setConnectorName('');
      setStackArn('');
      // The template details belong to the identity just created; a second Create without a new
      // Launch must not re-post it.
      clearIacConfirm();
    }
  );

  const handleCreate = useCallback(() => {
    createConnector({
      name: connectorName,
      cloudProvider: 'aws',
      accountType,
      vars: {
        role_arn: { value: roleArn, type: 'text' },
      },
      ...(hasPendingIacConfirm(iacConfirm) ? iacConfirm : {}),
      ...(trimmedStackArn && !stackArnInvalid ? { iac_deployment_id: trimmedStackArn } : {}),
    });
  }, [
    createConnector,
    connectorName,
    accountType,
    roleArn,
    iacConfirm,
    trimmedStackArn,
    stackArnInvalid,
  ]);

  const roleArnInvalid = hasInvalidRequiredVars && !roleArn;
  // While a live render is in flight `iacConfirm` is still unset, so a Create pressed then would
  // store a keyless identity and the late render's template details would land after the tab
  // switch, on nothing. Wait for it to settle; a failed render fails open once it does.
  const isCreateDisabled =
    isGeneratingTemplate ||
    !roleArn ||
    !!getCloudConnectorNameError(connectorName) ||
    stackArnInvalid;

  if (isLoadingConnectors) {
    return <EuiSkeletonText lines={4} data-test-subj="awsIdentityFederationSetup-loading" />;
  }

  const handleTabClick = (tab: { id: string }) => {
    setSelectedTabId(tab.id);
    if (tab.id === TABS.NEW_CONNECTION) {
      setSelected(undefined);
    }
  };

  const tabs: CloudConnectorTab[] = [
    {
      id: TABS.NEW_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.awsIdentityFederationSetup.newIdentityTab"
          defaultMessage="New Identity"
        />
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          <CloudConnectorNameField
            value={connectorName}
            onChange={(name) => setConnectorName(name)}
            data-test-subj="awsIdentityFederationSetup-connectorName"
          />
          <EuiSpacer size="m" />
          <EuiAccordion
            id="awsIdentityFederationGuide"
            buttonContent={
              <EuiLink>
                <FormattedMessage
                  id="xpack.fleet.awsIdentityFederationSetup.stepsToAssumeRole"
                  defaultMessage="Steps to assume role"
                />
              </EuiLink>
            }
            paddingSize="l"
          >
            <CloudFormationCloudCredentialsGuide accountType={accountType} />
          </EuiAccordion>
          <EuiSpacer size="l" />
          <LaunchCloudFormationButton
            launchButtonProps={launchButtonProps}
            isLoading={isGeneratingTemplate}
            // With the provisioner on the hook never disables the button, but a live render still
            // needs the console URL that only `cloud` provides, so keep the old guard.
            isDisabled={isLaunchDisabled || !cloud}
            templateGenerationError={templateGenerationError}
            data-test-subj="awsIdentityFederationSetup-launchCloudFormation"
            errorCalloutTestSubj="awsIdentityFederationSetup-templateError"
          />
          {isIacProvisionerEnabled && (
            <>
              <EuiSpacer size="m" />
              <StackArnField
                value={stackArn}
                onChange={setStackArn}
                data-test-subj="awsIdentityFederationSetup-stackArn"
              />
            </>
          )}
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnLabel', {
              defaultMessage: 'Role ARN',
            })}
            isInvalid={roleArnInvalid}
            error={
              roleArnInvalid
                ? i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnRequired', {
                    defaultMessage: 'Role ARN is required',
                  })
                : undefined
            }
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={roleArn}
              isInvalid={roleArnInvalid}
              onChange={(e) => setRoleArn(e.target.value)}
              data-test-subj="awsIdentityFederationSetup-roleArn"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isCreating}
                isDisabled={isCreateDisabled}
                onClick={handleCreate}
                data-test-subj="awsIdentityFederationSetup-createButton"
              >
                <FormattedMessage
                  id="xpack.fleet.awsIdentityFederationSetup.createButton"
                  defaultMessage="Create Identity"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      id: TABS.EXISTING_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.awsIdentityFederationSetup.existingIdentityTab"
          defaultMessage="Existing Identity"
        />
      ),
      content: (
        <>
          <CloudConnectorSelector
            provider="aws"
            cloudConnectorId={selected?.id}
            credentials={selected?.id ? { cloudConnectorId: selected.id } : {}}
            setCredentials={(creds) => {
              if (creds.cloudConnectorId) {
                setSelected({ id: creds.cloudConnectorId, name: creds.name });
              }
            }}
            accountType={accountType}
            packageName={packageName}
          />
          {integrations && integrations.length > 0 && (
            <>
              <EuiSpacer size="m" />
              {/* Keyed per identity AND integration set so the check's change-only reporting,
                  its verdict and its launched state start fresh for each combination: a set
                  widened after Launch must block again. */}
              <IacKeyCheck
                key={checkKey}
                cloudConnectorId={selected?.id}
                integrations={integrations}
                cloud={cloud}
                accountType={accountType}
                iacTemplateUrl={iacTemplateUrl}
                onValidityChange={handleCheckValidityChange}
                {...(onIacTemplateRecorded
                  ? { writeOnRender: false, onTemplateRecorded: onIacTemplateRecorded }
                  : {})}
              />
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <CloudConnectorTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      onTabClick={handleTabClick}
      isEditPage={isEditPage}
      cloudProvider="aws"
      cloudConnectorsCount={cloudConnectors.length}
    />
  );
};
