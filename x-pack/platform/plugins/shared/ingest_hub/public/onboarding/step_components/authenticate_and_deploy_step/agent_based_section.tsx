/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  useGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import type {
  AgentPolicy,
  AwsStaticKeyCredentials,
  AwsTemporaryKeyCredentials,
} from '@kbn/fleet-plugin/public';
import type { AgentCredentialVars } from './package_inputs';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { DeploymentSectionAccordion } from './section_accordion';

// ── Credential method type ────────────────────────────────────────────────────

type AgentCredentialMethod =
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'assume_role';

const CREDENTIAL_OPTIONS = [
  {
    value: 'direct_access_keys' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.directAccessKeys',
      { defaultMessage: 'Direct access keys' }
    ),
  },
  {
    value: 'temporary_keys' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.temporaryKeys',
      { defaultMessage: 'Temporary security credentials' }
    ),
  },
  {
    value: 'shared_credentials' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.sharedCredentials',
      { defaultMessage: 'Shared credentials file' }
    ),
  },
  {
    value: 'assume_role' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.assumeRole',
      { defaultMessage: 'Assume role' }
    ),
  },
];

// ── Local credential forms ────────────────────────────────────────────────────

function SharedCredentialsForm({
  sharedCredentialFile,
  credentialProfileName,
  onSharedCredentialFileChange,
  onCredentialProfileNameChange,
}: {
  sharedCredentialFile: string;
  credentialProfileName: string;
  onSharedCredentialFileChange: (val: string) => void;
  onCredentialProfileNameChange: (val: string) => void;
}) {
  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.fileLabel',
          { defaultMessage: 'Shared Credential File' }
        )}
        helpText={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.fileHelp',
          { defaultMessage: 'Directory of the shared credentials file' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={sharedCredentialFile}
          onChange={(e) => onSharedCredentialFileChange(e.target.value)}
          data-test-subj="agentBasedSection-sharedCredentialFile"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.profileLabel',
          { defaultMessage: 'Credential Profile Name' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={credentialProfileName}
          onChange={(e) => onCredentialProfileNameChange(e.target.value)}
          data-test-subj="agentBasedSection-credentialProfileName"
        />
      </EuiFormRow>
    </>
  );
}

function AssumeRoleForm({
  roleArn,
  onRoleArnChange,
}: {
  roleArn: string;
  onRoleArnChange: (val: string) => void;
}) {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.assumeRole.roleArnLabel',
        { defaultMessage: 'Role ARN' }
      )}
      fullWidth
    >
      <EuiFieldText
        fullWidth
        value={roleArn}
        onChange={(e) => onRoleArnChange(e.target.value)}
        data-test-subj="agentBasedSection-roleArn"
      />
    </EuiFormRow>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentBasedSectionProps {
  serviceCount: number;
  onDeploy: (instanceIds?: string[]) => void;
  /** Called whenever the credential form values change — keeps secrets in memory, never persisted. */
  onCredentialsChange?: (creds: AgentCredentialVars | undefined) => void;
  isDeploying: boolean;
  isDone: boolean;
  hasFailed: boolean;
  failedInstances: string[];
  /** Per-instance error message from the last deploy attempt, keyed by instanceId. */
  deployErrors?: Record<string, string>;
}

export function AgentBasedSection({
  serviceCount,
  onDeploy,
  onCredentialsChange,
  isDeploying,
  isDone,
  hasFailed,
  failedInstances,
  deployErrors,
}: AgentBasedSectionProps) {
  const { agentBasedDeployment, setAgentBasedDeployment } = useOnboardingFlow();
  const {
    agentHostsMode,
    agentPolicyId,
    selectedAgentPolicyIds,
    agentCredentialMethod: persistedCredentialMethod,
    sharedCredentialFile: persistedSharedCredentialFile,
    credentialProfileName: persistedCredentialProfileName,
    roleArn: persistedRoleArn,
  } = agentBasedDeployment;

  // ── Credential method ──────────────────────────────────────────────────────
  const credentialMethod = persistedCredentialMethod;
  const [isCredentialReady, setIsCredentialReady] = useState(() => {
    // For methods backed by persisted text fields, initialize ready from stored values.
    if (persistedCredentialMethod === 'shared_credentials') {
      return !!(persistedSharedCredentialFile || persistedCredentialProfileName);
    }
    if (persistedCredentialMethod === 'assume_role') {
      return !!persistedRoleArn;
    }
    return false;
  });

  // In-memory secrets — never persisted.
  const [staticKeyCreds, setStaticKeyCreds] = useState<AwsStaticKeyCredentials | undefined>(
    undefined
  );
  const [temporaryKeyCreds, setTemporaryKeyCreds] = useState<
    AwsTemporaryKeyCredentials | undefined
  >(undefined);

  // Notify the parent whenever credentials change so the deploy function can read them.
  const notifyCredentialChange = useCallback(
    (
      method: AgentCredentialMethod,
      overrides?: {
        staticCreds?: AwsStaticKeyCredentials | undefined;
        tempCreds?: AwsTemporaryKeyCredentials | undefined;
        sharedFile?: string;
        profileName?: string;
        arn?: string;
      }
    ) => {
      if (!onCredentialsChange) return;
      const resolvedStatic =
        overrides?.staticCreds !== undefined ? overrides.staticCreds : staticKeyCreds;
      const resolvedTemp =
        overrides?.tempCreds !== undefined ? overrides.tempCreds : temporaryKeyCreds;
      const resolvedSharedFile =
        overrides?.sharedFile !== undefined ? overrides.sharedFile : persistedSharedCredentialFile;
      const resolvedProfileName =
        overrides?.profileName !== undefined
          ? overrides.profileName
          : persistedCredentialProfileName;
      const resolvedArn = overrides?.arn !== undefined ? overrides.arn : persistedRoleArn;

      if (method === 'direct_access_keys' && resolvedStatic) {
        onCredentialsChange({ method, ...resolvedStatic });
      } else if (method === 'temporary_keys' && resolvedTemp) {
        onCredentialsChange({ method, ...resolvedTemp });
      } else if (method === 'shared_credentials') {
        onCredentialsChange({
          method,
          shared_credential_file: resolvedSharedFile,
          credential_profile_name: resolvedProfileName,
        });
      } else if (method === 'assume_role') {
        onCredentialsChange({ method, role_arn: resolvedArn });
      } else {
        onCredentialsChange(undefined);
      }
    },
    [
      onCredentialsChange,
      staticKeyCreds,
      temporaryKeyCreds,
      persistedSharedCredentialFile,
      persistedCredentialProfileName,
      persistedRoleArn,
    ]
  );

  // On mount, seed the deploy ref for persisted text-field methods so a Back/Next round-trip
  // doesn't silently deploy with undefined credentials.
  useEffect(() => {
    if (credentialMethod === 'shared_credentials' || credentialMethod === 'assume_role') {
      notifyCredentialChange(credentialMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  const handleCredentialMethodChange = (method: AgentCredentialMethod) => {
    setAgentBasedDeployment({ agentCredentialMethod: method });
    setIsCredentialReady(false);
    // Reset in-memory secrets on method switch (safety: don't carry static keys into temporary slot).
    setStaticKeyCreds(undefined);
    setTemporaryKeyCreds(undefined);
    // Notify with the new method so the deploy ref is cleared.
    notifyCredentialChange(method, { staticCreds: undefined, tempCreds: undefined });
  };

  // ── Hosts mode (new / existing) ────────────────────────────────────────────
  const hostsRadioOptions = [
    {
      id: 'new',
      label: i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.hosts.new.label',
        { defaultMessage: 'Create a new agent policy' }
      ),
    },
    {
      id: 'existing',
      label: i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.hosts.existing.label',
        { defaultMessage: 'Use an existing agent policy' }
      ),
    },
  ];

  // ── Existing policy multi-select ──────────────────────────────────────────
  const { data: policiesData, isLoading: isPoliciesLoading } = useGetAgentPoliciesQuery(
    { full: false, perPage: 1000, sortField: 'name', sortOrder: 'asc' },
    { enabled: agentHostsMode === 'existing' }
  );

  const policyOptions = useMemo(() => {
    return (policiesData?.items ?? [])
      .filter(
        (p: AgentPolicy) =>
          // Exclude Fleet-Server policies — adding an AWS integration there is a footgun.
          !p.is_managed && !p.has_fleet_server
      )
      .map((p: AgentPolicy) => ({ label: p.name, value: p.id }));
  }, [policiesData]);

  const selectedPolicyOptions = useMemo(
    () => policyOptions.filter((o) => selectedAgentPolicyIds.includes(o.value)),
    [policyOptions, selectedAgentPolicyIds]
  );

  const isEmpty = !isPoliciesLoading && policyOptions.length === 0;

  // ── Deploy success tracking ───────────────────────────────────────────────
  // For the "new policy" path, agentPolicyId is persisted on success and serves as the durable
  // flag. For the "existing policy" path, no policy id is created — instead we track success
  // via isDeploying going true→false with no failures, in this session only (not persisted).
  const [existingPolicyDeployDone, setExistingPolicyDeployDone] = useState(false);
  const prevIsDeployingRef = useRef(isDeploying);
  useEffect(() => {
    if (prevIsDeployingRef.current && !isDeploying && !hasFailed && agentHostsMode === 'existing') {
      setExistingPolicyDeployDone(true);
    }
    prevIsDeployingRef.current = isDeploying;
  }, [isDeploying, hasFailed, agentHostsMode]);

  // ── Flyout ────────────────────────────────────────────────────────────────
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const agentPolicyForFlyout = useMemo(() => {
    // New-policy path: use the created policy id.
    // Existing-policy path: pre-select the first selected policy in the flyout's dropdown.
    const policyId = agentPolicyId ?? selectedAgentPolicyIds[0];
    if (!policyId) return undefined;
    return { id: policyId } as AgentPolicy;
  }, [agentPolicyId, selectedAgentPolicyIds]);

  // ── "Add agent" click: deploy first (if needed), then open flyout ─────────
  // Track whether a deploy was kicked off in this session so we know to auto-open the flyout
  // when the deploy completes. Without this flag, mounting with an already-deployed state
  // (repeated onboarding, session storage retained) would suppress the transition.
  const deployInitiatedRef = useRef(false);

  // Whether the current mode already has a completed deploy backing it.
  // If the user switches from "existing" (which set existingPolicyDeployDone) to "new",
  // there is no agentPolicyId yet, so we must deploy rather than just opening the flyout.
  const isDeployedForCurrentMode =
    agentHostsMode === 'new' ? !!agentPolicyId : existingPolicyDeployDone;

  const handleAddAgentClick = useCallback(() => {
    if (isDeployedForCurrentMode) {
      // Already deployed for this mode — open flyout directly without re-deploying.
      setIsFlyoutOpen(true);
    } else {
      // Deploy, then open flyout on success via the effects below.
      deployInitiatedRef.current = true;
      onDeploy();
    }
  }, [isDeployedForCurrentMode, onDeploy]);

  // New-policy path: open flyout when agentPolicyId transitions undefined → set.
  const prevAgentPolicyIdRef = useRef<string | undefined>(agentPolicyId);
  useEffect(() => {
    if (agentPolicyId && !prevAgentPolicyIdRef.current && deployInitiatedRef.current) {
      setIsFlyoutOpen(true);
    }
    prevAgentPolicyIdRef.current = agentPolicyId;
  }, [agentPolicyId]);

  // Existing-policy path: open flyout when existingPolicyDeployDone flips true.
  const prevExistingDoneRef = useRef(existingPolicyDeployDone);
  useEffect(() => {
    if (existingPolicyDeployDone && !prevExistingDoneRef.current && deployInitiatedRef.current) {
      setIsFlyoutOpen(true);
    }
    prevExistingDoneRef.current = existingPolicyDeployDone;
  }, [existingPolicyDeployDone]);

  // ── Deploy readiness ──────────────────────────────────────────────────────
  const isAddAgentReady = useMemo(() => {
    // Already deployed for this mode → always ready to open flyout (no credential re-check needed).
    if (isDeployedForCurrentMode) return true;
    if (!isCredentialReady) return false;
    if (agentHostsMode === 'existing') return selectedAgentPolicyIds.length > 0;
    return true;
  }, [isDeployedForCurrentMode, isCredentialReady, agentHostsMode, selectedAgentPolicyIds]);

  const handleRetry = useCallback(() => {
    onDeploy(failedInstances.length > 0 ? failedInstances : undefined);
  }, [onDeploy, failedInstances]);

  // The same server error usually applies to every failed instance, so de-duplicate before
  // rendering to avoid repeating one long validation message N times.
  const uniqueErrorMessages = useMemo(() => {
    if (!deployErrors) return [];
    const relevant = failedInstances.length > 0 ? failedInstances : Object.keys(deployErrors);
    return [...new Set(relevant.map((id) => deployErrors[id]).filter(Boolean))];
  }, [deployErrors, failedInstances]);

  return (
    <>
      <DeploymentSectionAccordion
        icon="agentApp"
        title={i18n.translate('xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.title', {
          defaultMessage: 'Where to add this integration?',
        })}
        serviceCount={serviceCount}
        isDone={isDone}
        autoCollapse={false}
        dataTestSubj="agentBasedSection"
        headerButtonTestSubj="agentBasedSection-headerButton"
      >
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          {!isDeployedForCurrentMode && (
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.description"
                  defaultMessage="Deploy an Elastic Agent on your hosts to collect AWS data directly. Use this method for VPC-internal services, credentials that cannot leave your account, or log files on disk."
                />
              </p>
            </EuiText>
          )}

          {/* Credential fields — hidden once the current mode has a completed deploy. When the user
              switches to "new" after an existing-policy deploy (no agentPolicyId yet), credentials
              must be shown again so they can configure and deploy the new policy. */}
          {!isDeployedForCurrentMode && (
            <>
              <EuiSpacer size="m" />

              {/* Credential method selector */}
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethodLabel"
                    defaultMessage="Preferred method"
                  />
                }
              >
                <EuiSelect
                  options={CREDENTIAL_OPTIONS}
                  value={credentialMethod}
                  onChange={(e) =>
                    handleCredentialMethodChange(e.target.value as AgentCredentialMethod)
                  }
                  data-test-subj="agentBasedSection-credentialMethodSelect"
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Credential fields */}
              <Suspense fallback={<EuiLoadingSpinner />}>
                {credentialMethod === 'direct_access_keys' && (
                  <LazyAwsStaticKeysForm
                    onReadyChange={setIsCredentialReady}
                    onFieldsChange={(creds) => {
                      setStaticKeyCreds(creds ?? undefined);
                      notifyCredentialChange('direct_access_keys', {
                        staticCreds: creds ?? undefined,
                      });
                    }}
                    data-test-subj="agentBasedSection-directAccessKeysForm"
                  />
                )}
                {credentialMethod === 'temporary_keys' && (
                  <LazyAwsTemporaryKeysForm
                    onReadyChange={setIsCredentialReady}
                    onFieldsChange={(creds) => {
                      setTemporaryKeyCreds(creds ?? undefined);
                      notifyCredentialChange('temporary_keys', { tempCreds: creds ?? undefined });
                    }}
                    data-test-subj="agentBasedSection-temporaryKeysForm"
                  />
                )}
                {credentialMethod === 'shared_credentials' && (
                  <SharedCredentialsForm
                    sharedCredentialFile={persistedSharedCredentialFile ?? ''}
                    credentialProfileName={persistedCredentialProfileName ?? ''}
                    onSharedCredentialFileChange={(val) => {
                      setAgentBasedDeployment({ sharedCredentialFile: val });
                      notifyCredentialChange('shared_credentials', { sharedFile: val });
                      setIsCredentialReady(true);
                    }}
                    onCredentialProfileNameChange={(val) => {
                      setAgentBasedDeployment({ credentialProfileName: val });
                      notifyCredentialChange('shared_credentials', { profileName: val });
                    }}
                  />
                )}
                {credentialMethod === 'assume_role' && (
                  <AssumeRoleForm
                    roleArn={persistedRoleArn ?? ''}
                    onRoleArnChange={(val) => {
                      setAgentBasedDeployment({ roleArn: val });
                      notifyCredentialChange('assume_role', { arn: val });
                      setIsCredentialReady(!!val);
                    }}
                  />
                )}
              </Suspense>
              <EuiSpacer size="l" />
            </>
          )}

          <div data-test-subj="agentBasedSection-whereToAddPanel">
            {/* Hosts radio — always visible. Interactive before deploy, read-only after
                (button is gone so there's nothing to act on, but the selection stays visible). */}
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.hostsLabel"
                  defaultMessage="Hosts"
                />
              }
            >
              <EuiRadioGroup
                name="agentHostsMode"
                options={hostsRadioOptions}
                idSelected={agentHostsMode}
                onChange={(id) =>
                  setAgentBasedDeployment({ agentHostsMode: id as 'new' | 'existing' })
                }
                data-test-subj="agentBasedSection-hostsRadio"
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            {/* Pre-deploy: combobox for existing policy selection — only before a deploy has completed */}
            {!isDeployedForCurrentMode && agentHostsMode === 'existing' && (
              <>
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.existing.description"
                      defaultMessage="Select one or more agent policies to add this integration to."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.existing.agentPoliciesLabel',
                    { defaultMessage: 'Agent policies' }
                  )}
                  helpText={
                    isEmpty
                      ? i18n.translate(
                          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.existing.noAgentPoliciesHelp',
                          { defaultMessage: "There aren't any options available." }
                        )
                      : undefined
                  }
                >
                  <EuiComboBox
                    isLoading={isPoliciesLoading}
                    options={policyOptions}
                    selectedOptions={selectedPolicyOptions}
                    onChange={(selected) =>
                      setAgentBasedDeployment({
                        selectedAgentPolicyIds: selected.map((o) => o.value!),
                      })
                    }
                    placeholder={
                      isEmpty
                        ? i18n.translate(
                            'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.existing.noAgentPoliciesPlaceholder',
                            { defaultMessage: 'No agent policies available' }
                          )
                        : i18n.translate(
                            'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.existing.placeholder',
                            { defaultMessage: 'Select agent policies' }
                          )
                    }
                    isDisabled={isEmpty}
                    data-test-subj="agentBasedSection-agentPoliciesComboBox"
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
              </>
            )}

            {/* Pre-deploy description for new policy mode — only before a deploy has completed */}
            {!isDeployedForCurrentMode && agentHostsMode === 'new' && (
              <>
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.new.description"
                      defaultMessage="A new agent policy will be created for you. Click Add agent to set up your Elastic Agent."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
              </>
            )}

            {/* Post-deploy description — replaces the pre-deploy text once the current mode has a completed deploy */}
            {isDeployedForCurrentMode && (
              <>
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.deployed.description"
                      defaultMessage="A new Agent Policy is created for this integration. Add an Elastic Agent to a host to start collecting data — agents enroll in Fleet by default, so updates deploy automatically and agents are centrally managed."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
              </>
            )}

            {/* Primary CTA — always visible.
                Pre-deploy: labelled "Deploy integrations", deploys then opens flyout.
                Post-deploy: labelled "Add agent", opens flyout directly. */}
            <EuiButton
              fill
              isDisabled={!isAddAgentReady || isDeploying}
              isLoading={isDeploying}
              onClick={handleAddAgentClick}
              data-test-subj="agentBasedSection-addAgentButton"
            >
              {isDeploying ? (
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAgentButton.loading"
                  defaultMessage="Setting up..."
                />
              ) : isDeployedForCurrentMode ? (
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAgentButton"
                  defaultMessage="Add agent"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.deployButton"
                  defaultMessage="Deploy integrations"
                />
              )}
            </EuiButton>
          </div>

          {/* Error callout + retry */}
          {hasFailed && !isDeploying && (
            <>
              <EuiSpacer size="m" />
              <KbnDangerCallout
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.errorCallout.title"
                    defaultMessage="Deployment failed"
                  />
                }
                announceOnMount
                data-test-subj="agentBasedSection-errorCallout"
                text={
                  <>
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.errorCallout.body"
                      defaultMessage="One or more integrations could not be deployed."
                    />
                    {/* Surface the server's message — a generic string makes validation errors like
                      a missing required var impossible to diagnose from the UI. */}
                    {uniqueErrorMessages.length > 0 && (
                      <ul data-test-subj="agentBasedSection-errorMessages">
                        {uniqueErrorMessages.map((msg) => (
                          <li key={msg}>
                            {/* Fleet's validation errors are newline-separated (one line per
                              invalid var), which HTML would collapse into one run-on line. */}
                            <EuiText size="s" css={{ whiteSpace: 'pre-wrap' }}>
                              {msg}
                            </EuiText>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                }
                actionProps={{
                  primary: {
                    children: (
                      <FormattedMessage
                        id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.retryButton"
                        defaultMessage="Retry"
                      />
                    ),
                    onClick: handleRetry,
                    'data-test-subj': 'agentBasedSection-retryButton',
                  },
                }}
              />
            </>
          )}
        </EuiPanel>
      </DeploymentSectionAccordion>

      {/* Agent enrollment flyout — outside the accordion so it survives accordion collapsing on
          isDone. The flyout is a portal/overlay regardless of DOM position, but it must be mounted
          to be visible. The accordion unmounts its children when isOpen=false, which would
          discard isFlyoutOpen state and prevent the flyout from showing after a successful deploy. */}
      {isFlyoutOpen && (
        <Suspense fallback={null}>
          <LazyAgentEnrollmentFlyout
            agentPolicy={agentPolicyForFlyout}
            onClose={() => setIsFlyoutOpen(false)}
            isIntegrationFlow
          />
        </Suspense>
      )}
    </>
  );
}
