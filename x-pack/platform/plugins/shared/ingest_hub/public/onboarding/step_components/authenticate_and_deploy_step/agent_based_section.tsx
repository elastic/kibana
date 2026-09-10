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
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
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
  useGetAgentStatus,
} from '@kbn/fleet-plugin/public';
import type { AgentPolicy } from '@kbn/fleet-plugin/public';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AgentBasedTarget } from './agent_based_deploy';
import { SectionAccordion } from './section_accordion';
// Cross-step import: ServiceTile lives in deployment_summary because it was built for step 4.
// It has no context deps (4 props, fully presentational) so it imports cleanly here.
// Revisit this import location when there is a third consumer.
import { ServiceTile } from '../detect_and_review_step/deployment_summary/service_tile';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceChipState } from '../../onboarding_flow_context';

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
      { defaultMessage: 'IAM role ARN' }
    ),
  },
];

// ── Credential form state ─────────────────────────────────────────────────────

interface SharedCredentialsValues {
  credentialProfileName: string;
  sharedCredentialFile: string;
}
interface AssumeRoleValues {
  roleArn: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentBasedSectionProps {
  serviceCount: number;
  targets: AgentBasedTarget[];
  serviceStatuses: Record<string, ServiceChipState>;
  servicesMap: Map<string, AwsServiceMatrixEntry>;
  onDeploy: (instanceIds?: string[]) => void;
  isDeploying: boolean;
  isDone: boolean;
  hasFailed: boolean;
  failedInstances: string[];
  /** Per-instance error message from the last deploy attempt, keyed by instanceId. */
  deployErrors?: Record<string, string>;
}

export function AgentBasedSection({
  serviceCount,
  targets,
  serviceStatuses,
  servicesMap,
  onDeploy,
  isDeploying,
  isDone,
  hasFailed,
  failedInstances,
  deployErrors,
}: AgentBasedSectionProps) {
  const { agentBasedDeployment, setAgentBasedDeployment } = useOnboardingFlow();
  const { agentHostsMode, agentPolicyId, selectedAgentPolicyIds } = agentBasedDeployment;

  // ── Credential method ──────────────────────────────────────────────────────
  const [credentialMethod, setCredentialMethod] =
    useState<AgentCredentialMethod>('direct_access_keys');
  const [isCredentialReady, setIsCredentialReady] = useState(false);

  // ── Credential values for locally-managed forms (memory-only — secrets never persisted) ──────
  const [sharedCreds, setSharedCreds] = useState<SharedCredentialsValues>({
    credentialProfileName: '',
    sharedCredentialFile: '',
  });
  const [assumeRole, setAssumeRole] = useState<AssumeRoleValues>({ roleArn: '' });

  const handleCredentialMethodChange = (method: AgentCredentialMethod) => {
    setCredentialMethod(method);
    setIsCredentialReady(false);
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

  // ── Enrollment status ─────────────────────────────────────────────────────
  // Poll the real agent count from Fleet so "N agents enrolled" reflects actual enrollments, not
  // the initial 'detecting' status (set on all instances immediately after a successful deploy).
  // For existing-policy path, poll against the first selected policy (same one pre-selected in flyout).
  const pollPolicyId =
    agentPolicyId ?? (existingPolicyDeployDone ? selectedAgentPolicyIds[0] : undefined);
  const { data: agentStatusData } = useGetAgentStatus(
    { policyId: pollPolicyId ?? '' },
    { pollIntervalMs: pollPolicyId ? 10_000 : undefined }
  );
  const agentCount = pollPolicyId ? agentStatusData?.results?.all ?? 0 : 0;
  // UI locks (radio frozen, button hidden) only once an agent has actually enrolled.
  // Before that, the user can still change the radio or click "Add agent" to open the flyout again.
  const isAgentEnrolled = agentCount > 0;

  const receivingCount = Object.values(serviceStatuses).filter((s) => s === 'receiving').length;

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
      <SectionAccordion
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
          {(!isAgentEnrolled || !isDeployedForCurrentMode) && (
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.description"
                  defaultMessage="Deploy an Elastic Agent on your hosts to collect AWS data directly. Use this method for VPC-internal services, credentials that cannot leave your account, or log files on disk. Refer to our {gettingStartedLink} for details."
                  values={{
                    gettingStartedLink: (
                      <EuiLink target="_blank" external>
                        <FormattedMessage
                          id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.gettingStartedLink"
                          defaultMessage="Getting Started"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          )}

          {/* Credential fields — hidden once an agent enrolls on the current mode. When the user
              switches to "new" after an existing-policy deploy (no agentPolicyId yet), credentials
              must be shown again so they can configure and deploy the new policy. */}
          {(!isAgentEnrolled || !isDeployedForCurrentMode) && (
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
                    data-test-subj="agentBasedSection-directAccessKeysForm"
                  />
                )}
                {credentialMethod === 'temporary_keys' && (
                  <LazyAwsTemporaryKeysForm
                    onReadyChange={setIsCredentialReady}
                    data-test-subj="agentBasedSection-temporaryKeysForm"
                  />
                )}
                {credentialMethod === 'shared_credentials' && (
                  <SharedCredentialsForm
                    values={sharedCreds}
                    onChange={(v) => {
                      setSharedCreds(v);
                      setIsCredentialReady(
                        Boolean(v.credentialProfileName || v.sharedCredentialFile)
                      );
                    }}
                  />
                )}
                {credentialMethod === 'assume_role' && (
                  <AssumeRoleForm
                    values={assumeRole}
                    onChange={(v) => {
                      setAssumeRole(v);
                      setIsCredentialReady(Boolean(v.roleArn));
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

            {/* Primary CTA: Add agent — hidden once an agent has enrolled AND the current mode
                is already deployed. If the user switches to "new" after an existing-policy deploy,
                show it again so they can deploy+enroll on the new policy. */}
            {(!isAgentEnrolled || !isDeployedForCurrentMode) && (
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
                ) : (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAgentButton"
                    defaultMessage="Add agent"
                  />
                )}
              </EuiButton>
            )}

            {/* Post-enrollment status — shown only once at least one agent has actually enrolled.
                agentCount comes from useGetAgentStatus (live polling), not service statuses, so
                it stays 0 until a real agent connects — even though serviceStatuses immediately
                set instances to 'detecting' after a successful deploy. */}
            {isDeployedForCurrentMode && agentCount > 0 && (
              <>
                <EuiSpacer size="m" />
                <AgentEnrollmentStatus
                  enrolledCount={agentCount}
                  receivingCount={receivingCount}
                  totalCount={targets.length}
                  targets={targets}
                  serviceStatuses={serviceStatuses}
                  servicesMap={servicesMap}
                  onAddAgent={handleAddAgentClick}
                />
              </>
            )}
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
      </SectionAccordion>

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

// ── Local credential forms ────────────────────────────────────────────────────

function SharedCredentialsForm({
  values,
  onChange,
}: {
  values: SharedCredentialsValues;
  onChange: (v: SharedCredentialsValues) => void;
}) {
  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCreds.profileLabel"
            defaultMessage="Credential profile name"
          />
        }
      >
        <EuiFieldText
          value={values.credentialProfileName}
          onChange={(e) => onChange({ ...values, credentialProfileName: e.target.value })}
          data-test-subj="agentBasedSection-credentialProfileName"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCreds.fileLabel"
            defaultMessage="Shared credential file"
          />
        }
      >
        <EuiFieldText
          value={values.sharedCredentialFile}
          onChange={(e) => onChange({ ...values, sharedCredentialFile: e.target.value })}
          placeholder="~/.aws/credentials"
          data-test-subj="agentBasedSection-sharedCredentialFile"
        />
      </EuiFormRow>
    </>
  );
}

function AssumeRoleForm({
  values,
  onChange,
}: {
  values: AssumeRoleValues;
  onChange: (v: AssumeRoleValues) => void;
}) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.assumeRole.arnLabel"
          defaultMessage="Role ARN"
        />
      }
    >
      <EuiFieldText
        value={values.roleArn}
        onChange={(e) => onChange({ roleArn: e.target.value })}
        placeholder="arn:aws:iam::123456789012:role/MyRole"
        data-test-subj="agentBasedSection-roleArn"
      />
    </EuiFormRow>
  );
}

// ── Post-enrollment status ────────────────────────────────────────────────────

interface AgentEnrollmentStatusProps {
  enrolledCount: number;
  receivingCount: number;
  totalCount: number;
  targets: AgentBasedTarget[];
  serviceStatuses: Record<string, ServiceChipState>;
  servicesMap: Map<string, AwsServiceMatrixEntry>;
  onAddAgent: () => void;
}

function AgentEnrollmentStatus({
  enrolledCount,
  receivingCount,
  totalCount,
  targets,
  serviceStatuses,
  servicesMap,
  onAddAgent,
}: AgentEnrollmentStatusProps) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="success">
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.enrolledCount"
              defaultMessage="{count, plural, one {✓ # agent enrolled} other {✓ # agents enrolled}}"
              values={{ count: enrolledCount }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            size="m"
            onClick={onAddAgent}
            data-test-subj="agentBasedSection-addAnotherAgentButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAnotherAgent"
              defaultMessage="+ Add another agent"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued" aria-live="polite">
        <FormattedMessage
          id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.dataReceivedCount"
          defaultMessage="{receiving} of {total} - data received"
          values={{ receiving: receivingCount, total: totalCount }}
        />
      </EuiText>

      <EuiSpacer size="m" />

      {/* Per-instance service tiles — keyed on instance not service so duplicates appear */}
      <EuiFlexGrid columns={2} gutterSize="m">
        {targets.map(({ instance, service }) => {
          const entry = servicesMap.get(service.id) ?? service;
          const status = serviceStatuses[instance.instanceId] ?? 'detecting';
          return (
            <ServiceTile
              key={instance.instanceId}
              name={instance.name}
              status={status}
              entry={entry}
              deploymentMethod="agent_based"
            />
          );
        })}
      </EuiFlexGrid>
    </>
  );
}
