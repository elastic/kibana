/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  useGetAgentPoliciesQuery,
  agentPolicyFormValidation,
} from '@kbn/fleet-plugin/public';
import type {
  AgentPolicy,
  AwsStaticKeyCredentials,
  AwsTemporaryKeyCredentials,
  NewAgentPolicy,
} from '@kbn/fleet-plugin/public';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { AgentCredentialVars } from '../package_inputs';

import { useOnboardingFlow } from '../../../onboarding_flow_context';
import { DeploymentModeAccordion } from '../section_accordion';
import { buildAgentPolicyName } from '../agent_based_deploy/agent_policy_name';

import { CredentialMethodSelector } from './credential_method_selector';
import type { AgentCredentialMethod } from './credential_method_selector';
import { SharedCredentialsForm } from './shared_credentials_form';
import { AssumeRoleForm } from './assume_role_form';
import { AgentPolicyPanel } from './agent_policy_panel';

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentBasedSectionProps {
  serviceCount: number;
  onDeploy: (instanceIds?: string[]) => void;
  /** Called whenever the credential form values change — keeps secrets in memory, never persisted. */
  onCredentialsChange?: (creds: AgentCredentialVars | undefined) => void;
  /** Called whenever the section's Next-readiness changes, so the parent can gate the Next button. */
  onNextReadyChange?: (ready: boolean) => void;
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
  onNextReadyChange,
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
    agentPolicyName: persistedAgentPolicyName,
    withSysMonitoring: persistedWithSysMonitoring,
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

  // ── New-policy mode: policy form state ───────────────────────────────────
  const isPolicyCreated = !!agentPolicyId;

  const [newAgentPolicy, setNewAgentPolicy] = useState<Partial<NewAgentPolicy>>({
    name: persistedAgentPolicyName ?? '',
    namespace: 'default',
  });
  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(
    persistedWithSysMonitoring ?? true // default ON per Nima
  );
  const [isPolicyNameLoading, setIsPolicyNameLoading] = useState(!persistedAgentPolicyName);

  // Seed the name async on mount when no persisted name exists, or when the persisted name
  // is stale (policy was created in a previous session but agentPolicyId was cleared).
  useEffect(() => {
    if (persistedAgentPolicyName && agentPolicyId) return;
    let cancelled = false;
    buildAgentPolicyName().then((name) => {
      if (!cancelled) {
        setNewAgentPolicy((prev: Partial<NewAgentPolicy>) => ({ ...prev, name }));
        setIsPolicyNameLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  const validation = agentPolicyFormValidation(newAgentPolicy);
  const isPolicyFormValid = Object.keys(validation).length === 0;

  // ── Next-button readiness ─────────────────────────────────────────────────
  // Tells the parent step whether its Next button should be enabled.
  const isNextReady = isPolicyCreated
    ? true // policy exists; Next will attach package policies to it
    : agentHostsMode === 'existing'
    ? selectedAgentPolicyIds.length > 0
    : !isPolicyNameLoading && isPolicyFormValid && isCredentialReady;

  const onNextReadyChangeRef = useRef(onNextReadyChange);
  onNextReadyChangeRef.current = onNextReadyChange;
  useEffect(() => {
    onNextReadyChangeRef.current?.(isNextReady);
  }, [isNextReady]);

  // ── Accordion collapse ───────────────────────────────────────────────────
  const [accordionCollapsed, setAccordionCollapsed] = useState(false);

  // ── Policy created callback ───────────────────────────────────────────────
  const handleAgentPolicyCreated = useCallback(
    (policy: AgentPolicy) => {
      setNewAgentPolicy((prev: Partial<NewAgentPolicy>) => ({ ...prev, name: policy.name }));
      setAgentBasedDeployment({
        agentPolicyId: policy.id,
        agentPolicyName: policy.name,
      });
      setAccordionCollapsed(true);
    },
    [setAgentBasedDeployment]
  );

  // ── Existing policy multi-select ──────────────────────────────────────────
  const { data: policiesData, isLoading: isPoliciesLoading } = useGetAgentPoliciesQuery(
    {
      full: false,
      perPage: 1000,
      sortField: 'name',
      sortOrder: 'asc',
      kuery: `NOT ${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.supports_agentless:true`,
    },
    { enabled: agentHostsMode === 'existing' }
  );

  const policyOptions = useMemo(() => {
    return (policiesData?.items ?? [])
      .filter(
        (p: AgentPolicy) =>
          // Exclude Fleet-Server and agentless policies — adding an AWS integration there is a footgun.
          !p.is_managed && !p.has_fleet_server && !p.supports_agentless
      )
      .map((p: AgentPolicy) => ({ label: p.name, value: p.id }));
  }, [policiesData]);

  const selectedPolicyOptions = useMemo(
    () => policyOptions.filter((o) => selectedAgentPolicyIds.includes(o.value)),
    [policyOptions, selectedAgentPolicyIds]
  );

  const isEmpty = !isPoliciesLoading && policyOptions.length === 0;

  // ── Flyout ────────────────────────────────────────────────────────────────
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // ── Deploy readiness ──────────────────────────────────────────────────────
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
      <DeploymentModeAccordion
        icon="agentApp"
        title={i18n.translate('xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.title', {
          defaultMessage: 'Where to add this integration?',
        })}
        serviceCount={serviceCount}
        isDone={isDone}
        autoCollapse={false}
        forceCollapsed={accordionCollapsed}
        dataTestSubj="agentBasedSection"
        headerButtonTestSubj="agentBasedSection-headerButton"
      >
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.description"
                defaultMessage="Deploy an Elastic Agent on your hosts to collect AWS data directly. Use this method for VPC-internal services, credentials that cannot leave your account, or log files on disk."
              />
            </p>
          </EuiText>

          {/* Credential fields — show until the policy is created; in existing mode always show. */}
          {(!isPolicyCreated || agentHostsMode === 'existing') && (
            <>
              <EuiSpacer size="m" />

              {/* Credential method selector */}
              <CredentialMethodSelector
                value={credentialMethod}
                onChange={handleCredentialMethodChange}
              />

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

          <AgentPolicyPanel
            agentHostsMode={agentHostsMode}
            isPolicyCreated={isPolicyCreated}
            isCredentialReady={isCredentialReady}
            isPolicyNameLoading={isPolicyNameLoading}
            isPolicyFormValid={isPolicyFormValid}
            newAgentPolicy={newAgentPolicy}
            withSysMonitoring={withSysMonitoring}
            validation={validation}
            policyOptions={policyOptions}
            selectedPolicyOptions={selectedPolicyOptions}
            isPoliciesLoading={isPoliciesLoading}
            isEmpty={isEmpty}
            onHostsModeChange={(mode) => setAgentBasedDeployment({ agentHostsMode: mode })}
            onPoliciesChange={(selected) =>
              setAgentBasedDeployment({
                selectedAgentPolicyIds: selected.map((o) => o.value),
              })
            }
            onAgentPolicyChange={(u) => {
              const updated = { ...newAgentPolicy, ...u };
              setNewAgentPolicy(updated);
              setAgentBasedDeployment({
                agentPolicyName: updated.name as string | undefined,
              });
            }}
            onSysMonitoringChange={(val) => {
              setWithSysMonitoring(val);
              setAgentBasedDeployment({ withSysMonitoring: val });
            }}
            onAddAgentClick={() => setIsFlyoutOpen(true)}
            onAddAnotherAgentClick={() => setIsFlyoutOpen(true)}
            isDeploying={isDeploying}
          />

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
      </DeploymentModeAccordion>

      {/* Agent enrollment flyout — outside the accordion so it survives accordion collapsing on
          isDone. The flyout is a portal/overlay regardless of DOM position, but it must be mounted
          to be visible. The accordion unmounts its children when isOpen=false, which would
          discard isFlyoutOpen state and prevent the flyout from showing after a successful deploy. */}
      {isFlyoutOpen && (
        <Suspense fallback={null}>
          <LazyAgentEnrollmentFlyout
            agentPolicy={isPolicyCreated ? ({ id: agentPolicyId } as AgentPolicy) : undefined}
            onClose={() => setIsFlyoutOpen(false)}
            isIntegrationFlow
            hideIncomingDataStep
            onAgentPolicyCreated={!isPolicyCreated ? handleAgentPolicyCreated : undefined}
            defaultAgentPolicyName={!isPolicyCreated ? newAgentPolicy.name : undefined}
            forceCreatePolicy={!isPolicyCreated}
          />
        </Suspense>
      )}
    </>
  );
}
