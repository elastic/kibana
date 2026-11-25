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
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
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
import { hasPendingIacConfirm } from '../../../hooks/use_request/pending_cloud_connector_iac';
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../../../common/types/rest_spec/iac_provisioner';
import { AWS_CLOUD_PROVIDER } from '../../../../common/types/models/cloud_connector';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';
import {
  useProvisioningCallback,
  type CloudConnectorCallbackCreated,
} from '../hooks/use_provisioning_callback';
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
import {
  INVALID_ROLE_ARN_MESSAGE,
  getCloudConnectorNameError,
  isRoleArnInvalid,
  isStackArnInvalid,
} from '../utils';
import { TABS } from '../constants';

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
  /**
   * Rendered next to Create Identity inside the "Create stack manually" section, for the host
   * to place the action that follows a manual identity (the onboarding's Deploy button).
   */
  manualEntryActions?: React.ReactNode;
  /** Fired on mount and whenever the tab changes: true while the New Identity tab is shown. */
  onNewIdentityTabChange?: (isNewIdentityTab: boolean) => void;
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
  manualEntryActions,
  onNewIdentityTabChange,
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
  const [roleArn, setRoleArn] = useState('');
  const [stackArn, setStackArn] = useState('');
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

  // Validate what Create will post: a pasted ARN often carries surrounding whitespace.
  const trimmedStackArn = stackArn.trim();
  const stackArnInvalid = isStackArnInvalid(stackArn);
  const trimmedRoleArn = roleArn.trim();
  const roleArnFormatInvalid = isRoleArnInvalid(roleArn);

  // Two ways to a new identity. Launch creates a record the stack reports to, and the server
  // creates the identity from that report; while the form waits, the ARN fields are locked and
  // show a spinner. Typing the ARNs and pressing Create is the fallback: for a stack deployed
  // outside the console, a template that cannot report back, or a wait the user gives up on.
  const {
    available: isCallbackAvailable,
    isChecking: isCallbackChecking,
    unavailableReason: callbackUnavailableReason,
    status: callbackStatus,
    created: callbackCreated,
    start: startCallback,
    cancel: cancelCallback,
  } = useProvisioningCallback({ enabled: isAwsIdentityFederationEnabled });
  // True while a manual Create is retiring the pending record.
  const [isHandingOff, setIsHandingOff] = useState(false);
  // Waiting on the stack, or on the server making the identity from its report.
  const isWaiting = callbackStatus === 'pending' || callbackStatus === 'receiving';
  // The ARN fields only show values while the form waits, and afterwards, when they hold what
  // the stack reported and the identity already exists.
  const isManualEntryLocked = isWaiting || callbackStatus === 'received';

  // The initial tab is decided once, from the list as first loaded. Deciding again whenever the
  // list turns non-empty would move the user to Existing Identity the moment the stack creates
  // the first identity of a project, away from the stages still being shown.
  const hasSetInitialTab = useRef(false);
  useEffect(() => {
    if (hasSetInitialTab.current) return;
    if (isEditPage) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      hasSetInitialTab.current = true;
      return;
    }
    if (isLoadingConnectors) return;
    hasSetInitialTab.current = true;
    if (cloudConnectors.length > 0) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
    }
  }, [cloudConnectors.length, isEditPage, isLoadingConnectors]);

  useEffect(() => {
    onNewIdentityTabChange?.(selectedTabId === TABS.NEW_CONNECTION);
  }, [selectedTabId, onNewIdentityTabChange]);

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
    async (iac: CloudConnectorIacState | undefined) => {
      // The fields will show what this launch's stack reports.
      setRoleArn('');
      setStackArn('');
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
    iacConfirm,
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

  const notifyCancelFailed = useCallback(() => {
    notifications?.toasts.addDanger({
      title: i18n.translate('xpack.fleet.cloudConnector.provisioningCallback.cancelFailed', {
        defaultMessage:
          'Could not stop waiting for CloudFormation. Try again, or wait for the stack to report back.',
      }),
    });
  }, [notifications]);

  // A later launch that never reached the console cannot call back, so retire the record an
  // earlier launch created.
  useEffect(() => {
    if (callbackStatus === 'pending' && templateGenerationError) {
      cancelCallback().then((outcome) => {
        if (outcome === 'failed') {
          notifyCancelFailed();
        }
      });
    }
  }, [callbackStatus, templateGenerationError, cancelCallback, notifyCancelFailed]);

  // The way out of a wait the user does not want to see through: the console was closed, or
  // opened in the wrong account. The form unlocks once the record is retired.
  const [isCancelling, setIsCancelling] = useState(false);
  const handleCancelWait = useCallback(async () => {
    setIsCancelling(true);
    const outcome = await cancelCallback();
    setIsCancelling(false);
    if (outcome === 'failed') {
      notifyCancelFailed();
    }
  }, [cancelCallback, notifyCancelFailed]);

  // Once the wait has ended without an identity, the fields unlock and a hint says so.
  const hasCallbackGivenUp = callbackStatus === 'expired' || callbackStatus === 'error';

  // The manual section stays folded while Launch can do the work on its own; it unfolds when
  // typing the ARNs is the only way left: no callback possible, or a wait that ended without
  // an identity. The user can fold and unfold it freely in between.
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const isManualEntryTheOnlyWay =
    (!isCallbackAvailable && !isCallbackChecking) || hasCallbackGivenUp;
  useEffect(() => {
    if (isManualEntryTheOnlyWay) {
      setIsManualEntryOpen(true);
    }
  }, [isManualEntryTheOnlyWay]);

  // The stack deployed the template rendered for this integration set, so the identity is
  // current by construction; IacKeyCheck only mounts on the Existing tab and would otherwise
  // never lift the pessimistic initial verdict.
  const selectCreatedIdentity = useCallback(
    (created: CloudConnectorCallbackCreated) => {
      setSelected({ id: created.id, name: created.name });
      setCheckVerdict({ key: `${created.id}|${integrationsKey}`, isValid: true });
    },
    [integrationsKey]
  );

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
    // The fields show what the stack reported; the identity itself is already created. The
    // screen stays as it is, so the user is not moved away from the progress they are watching.
    setRoleArn(callbackCreated.role_arn ?? '');
    setStackArn(callbackCreated.stack_arn ?? '');
    // On the Existing tab the user has picked an identity, and that pick stands. The New tab
    // selects the created identity when it is shown again.
    if (selectedTabId === TABS.NEW_CONNECTION) {
      selectCreatedIdentity(callbackCreated);
    }
    // The template details belong to the identity the stack just created.
    clearIacConfirm();
  }, [
    callbackCreated,
    selectedTabId,
    selectCreatedIdentity,
    queryClient,
    notifications,
    clearIacConfirm,
  ]);

  const { mutate: createConnector, isLoading: isCreating } = useCreateCloudConnector(
    (connector) => {
      setSelected({ id: connector.id, name: connector.name });
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      setRoleArn('');
      setConnectorName('');
      setStackArn('');
      // The template details belong to the identity just created; a second Create without a new
      // Launch must not re-post them.
      clearIacConfirm();
    }
  );

  const handleCreate = useCallback(async () => {
    // A record the deadline could not retire is still live, so retire it first: a late report
    // must not create a second identity. When the stack got there first, its identity is picked
    // up instead of creating one by hand.
    setIsHandingOff(true);
    const outcome = await cancelCallback();
    setIsHandingOff(false);
    if (outcome === 'created') {
      return;
    }
    if (outcome === 'failed') {
      notifyCancelFailed();
      return;
    }
    createConnector({
      name: connectorName,
      cloudProvider: 'aws',
      accountType,
      vars: {
        role_arn: { value: trimmedRoleArn, type: 'text' },
      },
      ...(hasPendingIacConfirm(iacConfirm) ? iacConfirm : {}),
      ...(trimmedStackArn && !stackArnInvalid ? { iac_deployment_id: trimmedStackArn } : {}),
    });
  }, [
    cancelCallback,
    notifyCancelFailed,
    createConnector,
    connectorName,
    accountType,
    trimmedRoleArn,
    iacConfirm,
    trimmedStackArn,
    stackArnInvalid,
  ]);

  const roleArnRequiredInvalid = hasInvalidRequiredVars && !trimmedRoleArn;
  const roleArnInvalid = roleArnRequiredInvalid || roleArnFormatInvalid;
  // When the stack can report back, the record it reports to must already carry the name, so
  // Launch needs one. Without the callback the name is only needed at Create.
  const isLaunchMissingName = isCallbackAvailable && !!getCloudConnectorNameError(connectorName);
  // While a live render is in flight `iacConfirm` is still unset, so a Create pressed then would
  // store a keyless identity and the late render's template details would land after the tab
  // switch, on nothing. Wait for it to settle; a failed render fails open once it does.
  const isCreateDisabled =
    isManualEntryLocked ||
    isGeneratingTemplate ||
    !trimmedRoleArn ||
    roleArnFormatInvalid ||
    !!getCloudConnectorNameError(connectorName) ||
    stackArnInvalid;

  if (isLoadingConnectors) {
    return <EuiSkeletonText lines={4} data-test-subj="awsIdentityFederationSetup-loading" />;
  }

  const handleTabClick = (tab: { id: string }) => {
    setSelectedTabId(tab.id);
    if (tab.id === TABS.NEW_CONNECTION) {
      // The New tab starts without a selection, unless it still shows the identity the stack
      // created: that one stays selected, since the tab cannot make another until a new Launch.
      if (callbackStatus === 'received' && callbackCreated) {
        selectCreatedIdentity(callbackCreated);
      } else {
        setSelected(undefined);
      }
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
          {/* The record holds the name typed at Launch and the server creates the identity from
              it, so the field is locked while the form waits and once the identity exists. */}
          <CloudConnectorNameField
            value={connectorName}
            onChange={(name) => setConnectorName(name)}
            disabled={isManualEntryLocked}
            data-test-subj="awsIdentityFederationSetup-connectorName"
          />
          <EuiSpacer size="m" />
          {!isCallbackAvailable && !isCallbackChecking && (
            <>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate(
                  'xpack.fleet.cloudConnector.provisioningCallback.unavailableTitle',
                  {
                    defaultMessage: 'CloudFormation cannot report back to this Kibana',
                  }
                )}
                data-test-subj="awsIdentityFederationSetup-callbackUnavailable"
                text={
                  <>
                    {callbackUnavailableReason && (
                      <p data-test-subj="awsIdentityFederationSetup-callbackUnavailableReason">
                        {callbackUnavailableReason}
                      </p>
                    )}
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.provisioningCallback.unavailableHint"
                        defaultMessage="The stack reports the created role ARN to Kibana over HTTPS. Set Kibana's public URL (server.publicBaseUrl) to an HTTPS URL that AWS can reach with a publicly trusted certificate. Fix it, then reload this page."
                      />
                    </p>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.provisioningCallback.unavailableManualHint"
                        defaultMessage="Until then, launch the stack, copy the stack ARN and Role ARN from its Outputs tab, and create the identity below."
                      />
                    </p>
                  </>
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
            // One launch at a time, and none once this launch's stack has made the identity: a
            // second stack would only create a duplicate.
            isDisabled={
              isLaunchDisabled ||
              !cloud ||
              isCallbackChecking ||
              isLaunchMissingName ||
              isWaiting ||
              callbackStatus === 'received'
            }
            templateGenerationError={templateGenerationError}
            data-test-subj="awsIdentityFederationSetup-launchCloudFormation"
            errorCalloutTestSubj="awsIdentityFederationSetup-templateError"
          />
          {isWaiting && (
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
                    {callbackStatus === 'receiving' ? (
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.provisioningCallback.creatingIdentityStage"
                        defaultMessage="Creating identity"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.provisioningCallback.creatingStackStage"
                        defaultMessage="Creating stack"
                      />
                    )}
                  </EuiText>
                </EuiFlexItem>
                {/* Once the stack has reported there is nothing left to cancel. */}
                {callbackStatus === 'pending' && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      isLoading={isCancelling}
                      onClick={handleCancelWait}
                      data-test-subj="awsIdentityFederationSetup-cancelCallback"
                    >
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.provisioningCallback.cancelButton"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
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
                  id="xpack.fleet.cloudConnector.provisioningCallback.givenUpHint"
                  defaultMessage="CloudFormation did not report back. Launch it again, or create the stack manually below."
                />
              </EuiText>
            </>
          )}
          <EuiSpacer size="l" />
          {/* The fallback to the callback: a stack deployed outside the console, a template that
              cannot report back, or a wait that ran out. Whichever way the stack was created, its
              ARN is worth recording: it is what the identity's details link to and what a later
              update targets. */}
          <EuiAccordion
            id="awsIdentityFederationManualEntry"
            buttonContent={
              <EuiLink>
                <FormattedMessage
                  id="xpack.fleet.awsIdentityFederationSetup.createStackManually"
                  defaultMessage="Create stack manually"
                />
              </EuiLink>
            }
            buttonProps={{ 'data-test-subj': 'awsIdentityFederationSetup-manualEntryToggle' }}
            forceState={isManualEntryOpen ? 'open' : 'closed'}
            onToggle={setIsManualEntryOpen}
            paddingSize="l"
            data-test-subj="awsIdentityFederationSetup-manualEntry"
          >
            <CloudFormationCloudCredentialsGuide accountType={accountType} completion="paste" />
            <EuiSpacer size="l" />
            <StackArnField
              value={stackArn}
              onChange={setStackArn}
              readOnly={isManualEntryLocked}
              data-test-subj="awsIdentityFederationSetup-stackArn"
            />
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnLabel', {
                defaultMessage: 'Role ARN',
              })}
              isInvalid={roleArnInvalid}
              error={
                roleArnRequiredInvalid
                  ? i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnRequired', {
                      defaultMessage: 'Role ARN is required',
                    })
                  : roleArnFormatInvalid
                  ? INVALID_ROLE_ARN_MESSAGE
                  : undefined
              }
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={roleArn}
                isInvalid={roleArnInvalid}
                readOnly={isManualEntryLocked}
                onChange={(e) => setRoleArn(e.target.value)}
                data-test-subj="awsIdentityFederationSetup-roleArn"
              />
            </EuiFormRow>
            <EuiSpacer size="l" />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={isCreating || isHandingOff}
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
              {manualEntryActions && <EuiFlexItem grow={false}>{manualEntryActions}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiAccordion>
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
