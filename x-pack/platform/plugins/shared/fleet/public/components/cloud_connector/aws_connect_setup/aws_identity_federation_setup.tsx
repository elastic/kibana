/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { CloudSetupForCloudConnector } from '../types';

import type { AccountType } from '../../../types';
import { useDisabledIdentityFederationProviders, useIacProvisioner } from '../../../hooks';
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../../../common/types/rest_spec/iac_provisioner';
import { AWS_CLOUD_PROVIDER } from '../../../../common/types/models/cloud_connector';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { useIacCallback } from '../hooks/use_iac_callback';
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
import { getCloudConnectorNameError } from '../utils';
import { TABS } from '../constants';

export interface AwsIdentityFederationSetupProps {
  accountType?: AccountType;
  packageName?: string;
  cloud?: CloudSetupForCloudConnector;
  iacTemplateUrl?: string;
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
  isEditPage = false,
  initialConnectorId,
  policyTemplates,
  integrations,
  onReadyChange,
  onConnectorIdChange,
  onIacTemplateRecorded,
}) => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const isAwsIdentityFederationEnabled =
    !useDisabledIdentityFederationProviders().includes(AWS_CLOUD_PROVIDER);
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();
  const { data: cloudConnectors = [], isLoading: isLoadingConnectors } = useGetCloudConnectors({
    cloudProvider: 'aws',
    accountType,
    packageName,
  });

  const [selectedTabId, setSelectedTabId] = useState<string>(TABS.NEW_CONNECTION);
  const [connectorName, setConnectorName] = useState('');
  const [selected, setSelected] = useState<{ id: string; name?: string } | undefined>(
    initialConnectorId ? { id: initialConnectorId } : undefined
  );
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

  // The stack's report is the only way a new identity is created: the receive route stores the
  // Role ARN and stack ARN it carries on the cloud connector, so the form has no ARN fields.
  const {
    available: isCallbackAvailable,
    status: callbackStatus,
    created: callbackCreated,
    start: startCallback,
    cancel: cancelCallback,
  } = useIacCallback({ enabled: isAwsIdentityFederationEnabled });
  // The name the pending record holds: what the stack's report will call the identity.
  const [launchedName, setLaunchedName] = useState('');

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

  // The template details of the launch (key + blueprint from the render, or nulls after a
  // static-template fallback) go onto the callback record, so the identity the stack's report
  // creates stores them as iac_key / iac_blueprint_* for the later upgrade check.
  // No stale-render guard here: see the `integrations` prop contract.
  // The hook's `templateAlreadyCurrent` is not consumed: it only fires when a stored digest is
  // sent, and New Identity never has one.
  const getLaunchStackParams = useCallback(
    (iac: CloudConnectorIacState | undefined) => {
      setLaunchedName(connectorName.trim());
      return startCallback({
        connectorName,
        accountType,
        iacKey: iac?.iac_key,
        iacBlueprintId: iac?.iac_blueprint_id,
        iacBlueprintVersion: iac?.iac_blueprint_version,
      });
    },
    [startCallback, connectorName, accountType]
  );
  const {
    launchButtonProps,
    isDisabled: isLaunchDisabled,
    isGeneratingTemplate,
    templateGenerationError,
    clearIacConfirm,
  } = useCloudConnectorTemplate({
    provider: 'aws',
    cloud,
    accountType,
    iacTemplateUrl,
    packageName,
    policyTemplates,
    // undefined → static template: opened directly with the provisioner off, or through the
    // hook's missing-context fallback (with fallback telemetry) with it on.
    integrations,
    getLaunchStackParams: isCallbackAvailable ? getLaunchStackParams : undefined,
  });

  // A later launch that never reached the console cannot call back, so retire the record an
  // earlier launch created.
  useEffect(() => {
    if (callbackStatus === 'pending' && templateGenerationError) {
      cancelCallback();
    }
  }, [callbackStatus, templateGenerationError, cancelCallback]);

  // Once the wait has ended without an identity, a hint asks for another launch.
  const hasCallbackGivenUp = callbackStatus === 'expired' || callbackStatus === 'error';

  const handledCreatedIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!callbackCreated || handledCreatedIdRef.current === callbackCreated.id) return;
    handledCreatedIdRef.current = callbackCreated.id;
    queryClient.invalidateQueries(['get-cloud-connectors']);
    notifications?.toasts.addSuccess({
      title: i18n.translate('xpack.fleet.cloudConnector.createSuccess', {
        defaultMessage: 'Federated identity created successfully',
      }),
    });
    setSelected({ id: callbackCreated.id, name: callbackCreated.name });
    setSelectedTabId(TABS.EXISTING_CONNECTION);
    setConnectorName('');
    // The template details belong to the identity the stack just created.
    clearIacConfirm();
  }, [callbackCreated, queryClient, notifications, clearIacConfirm]);

  // The record the stack reports to must already carry the name, so Launch needs one; and
  // without a callback nothing could create the identity, so Launch waits for one too.
  const isLaunchMissingName = !!getCloudConnectorNameError(connectorName);

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
          {/* A pending record holds the name typed at Launch, which the hint below shows. */}
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
          {!isCallbackAvailable && (
            <>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.fleet.cloudConnector.iacCallback.unavailableTitle', {
                  defaultMessage: 'CloudFormation cannot report back to this Kibana',
                })}
                data-test-subj="awsIdentityFederationSetup-callbackUnavailable"
                text={
                  <p>
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.iacCallback.unavailableHint"
                      defaultMessage="The stack creates the federated identity by reporting its Role ARN back to Kibana over HTTPS. Set a public HTTPS URL for Kibana (server.publicBaseUrl), then reload this page."
                    />
                  </p>
                }
              />
              <EuiSpacer size="m" />
            </>
          )}
          <LaunchCloudFormationButton
            launchButtonProps={launchButtonProps}
            isLoading={isGeneratingTemplate}
            // With the provisioner on the hook never disables the button, but a live render still
            // needs the console URL that only `cloud` provides, so keep the old guard.
            isDisabled={isLaunchDisabled || !cloud || !isCallbackAvailable || isLaunchMissingName}
            templateGenerationError={templateGenerationError}
            data-test-subj="awsIdentityFederationSetup-launchCloudFormation"
            errorCalloutTestSubj="awsIdentityFederationSetup-templateError"
          />
          {callbackStatus === 'pending' && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                data-test-subj="awsIdentityFederationSetup-callbackPending"
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner
                    size="m"
                    data-test-subj="awsIdentityFederationSetup-callbackSpinner"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.iacCallback.pendingHint"
                      defaultMessage="Waiting for CloudFormation to create the federated identity {name}. Keep this page open; the identity is selected here as soon as the stack reports back."
                      values={{ name: <strong>{launchedName}</strong> }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          {hasCallbackGivenUp && (
            <>
              <EuiSpacer size="s" />
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="awsIdentityFederationSetup-callbackGivenUp"
              >
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.iacCallback.givenUpHint"
                  defaultMessage="CloudFormation did not report back. Check the stack in the AWS console, then launch it again to create the identity."
                />
              </EuiText>
            </>
          )}
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
