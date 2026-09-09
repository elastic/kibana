/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  useGetAgentPoliciesQuery,
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

  // ── Flyout ────────────────────────────────────────────────────────────────
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const agentPolicyForFlyout = useMemo(() => {
    if (!agentPolicyId) return undefined;
    // Minimal AgentPolicy shape the flyout needs — it only reads id and name.
    return { id: agentPolicyId } as AgentPolicy;
  }, [agentPolicyId]);

  // ── "Add agent" click: deploy first (if needed), then open flyout ─────────
  const handleAddAgentClick = useCallback(() => {
    if (agentPolicyId) {
      // Already deployed — open flyout directly without re-deploying.
      setIsFlyoutOpen(true);
    } else {
      // Deploy the agent policy + package policies, then open the flyout.
      // The parent's onDeploy sets agentPolicyId on success; we watch it via useEffect
      // to open the flyout once the id lands (see below).
      onDeploy();
    }
  }, [agentPolicyId, onDeploy]);

  // Open flyout automatically once the deploy succeeds and agentPolicyId is set.
  // Only fires on the transition from absent → present, not on re-renders.
  const prevAgentPolicyIdRef = useRef<string | undefined>(agentPolicyId);
  useEffect(() => {
    if (agentPolicyId && !prevAgentPolicyIdRef.current) {
      setIsFlyoutOpen(true);
    }
    prevAgentPolicyIdRef.current = agentPolicyId;
  }, [agentPolicyId]);

  // ── Deploy readiness ──────────────────────────────────────────────────────
  const isAddAgentReady = useMemo(() => {
    // Already deployed → always ready to open flyout (no credential re-check needed).
    if (agentPolicyId) return true;
    if (!isCredentialReady) return false;
    if (agentHostsMode === 'existing') return selectedAgentPolicyIds.length > 0;
    return true;
  }, [agentPolicyId, isCredentialReady, agentHostsMode, selectedAgentPolicyIds]);

  // ── Enrollment status ─────────────────────────────────────────────────────
  const enrolledCount = Object.values(serviceStatuses).filter(
    (s) => s === 'receiving' || s === 'detecting' || s === 'timeout'
  ).length;

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
    <SectionAccordion
      icon="agentApp"
      title={i18n.translate('xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.title', {
        defaultMessage: 'Agent-based',
      })}
      serviceCount={serviceCount}
      isDone={isDone}
      dataTestSubj="agentBasedSection"
      headerButtonTestSubj="agentBasedSection-headerButton"
    >
      <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
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
            onChange={(e) => handleCredentialMethodChange(e.target.value as AgentCredentialMethod)}
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
                setIsCredentialReady(Boolean(v.credentialProfileName || v.sharedCredentialFile));
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

        {/* Where to add this integration — nested bordered panel */}
        <EuiPanel hasBorder paddingSize="m" data-test-subj="agentBasedSection-whereToAddPanel">
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.title"
                defaultMessage="Where to add this integration?"
              />
            </strong>
          </EuiText>

          <EuiSpacer size="m" />

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

          {agentHostsMode === 'existing' && (
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

          {agentHostsMode === 'new' && !agentPolicyId && (
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.new.description"
                  defaultMessage="A new agent policy will be created for you. Click Add agent to set up your Elastic Agent."
                />
              </p>
            </EuiText>
          )}

          {agentHostsMode === 'new' && !agentPolicyId && <EuiSpacer size="m" />}

          {/* Primary CTA: Add agent — deploys policy on first click, then opens flyout */}
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

          {/* Post-enrollment status — shown once agentPolicyId is set */}
          {agentPolicyId && (
            <>
              <EuiSpacer size="m" />
              <AgentEnrollmentStatus
                enrolledCount={enrolledCount}
                receivingCount={receivingCount}
                totalCount={targets.length}
                targets={targets}
                serviceStatuses={serviceStatuses}
                servicesMap={servicesMap}
                onAddAgent={() => setIsFlyoutOpen(true)}
              />
            </>
          )}
        </EuiPanel>

        {/* Error callout + retry */}
        {hasFailed && !isDeploying && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.errorCallout.title"
                  defaultMessage="Deployment failed"
                />
              }
              color="danger"
              iconType="error"
              announceOnMount
              data-test-subj="agentBasedSection-errorCallout"
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.errorCallout.body"
                defaultMessage="One or more integrations could not be deployed."
              />
              {/* Surface the server's message — a generic string makes validation errors like a
                  missing required var impossible to diagnose from the UI. */}
              {uniqueErrorMessages.length > 0 && (
                <ul data-test-subj="agentBasedSection-errorMessages">
                  {uniqueErrorMessages.map((msg) => (
                    <li key={msg}>
                      {/* Fleet's validation errors are newline-separated (one line per invalid
                          var), which HTML would collapse into one run-on line. */}
                      <EuiText size="s" css={{ whiteSpace: 'pre-wrap' }}>
                        {msg}
                      </EuiText>
                    </li>
                  ))}
                </ul>
              )}
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                color="danger"
                onClick={handleRetry}
                data-test-subj="agentBasedSection-retryButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.retryButton"
                  defaultMessage="Retry"
                />
              </EuiButton>
            </EuiCallOut>
          </>
        )}
      </EuiPanel>

      {/* Agent enrollment flyout — opens after deploy, when agentPolicyId is set */}
      {isFlyoutOpen && agentPolicyId && (
        <Suspense fallback={null}>
          <LazyAgentEnrollmentFlyout
            agentPolicy={agentPolicyForFlyout}
            onClose={() => setIsFlyoutOpen(false)}
            isIntegrationFlow
          />
        </Suspense>
      )}
    </SectionAccordion>
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
          <EuiButtonEmpty
            size="xs"
            onClick={onAddAgent}
            data-test-subj="agentBasedSection-addAnotherAgentButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAnotherAgent"
              defaultMessage="+ Add another agent"
            />
          </EuiButtonEmpty>
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
