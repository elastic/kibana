/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiButton,
  EuiComboBox,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LazyAgentPolicyIntegrationForm } from '@kbn/fleet-plugin/public';
import type { NewAgentPolicy, ValidationResults } from '@kbn/fleet-plugin/public';

// ── AgentPolicyPanel component ────────────────────────────────────────────────

interface PolicyOption {
  label: string;
  value: string;
}

interface AgentPolicyPanelProps {
  agentHostsMode: 'new' | 'existing';
  isPolicyCreated: boolean;
  isCredentialReady: boolean;
  isPolicyNameLoading: boolean;
  isPolicyFormValid: boolean;
  newAgentPolicy: Partial<NewAgentPolicy>;
  withSysMonitoring: boolean;
  validation: ValidationResults;
  policyOptions: PolicyOption[];
  selectedPolicyOptions: PolicyOption[];
  isPoliciesLoading: boolean;
  isEmpty: boolean;
  onHostsModeChange: (mode: 'new' | 'existing') => void;
  onPoliciesChange: (selected: PolicyOption[]) => void;
  onAgentPolicyChange: (update: Partial<NewAgentPolicy>) => void;
  onSysMonitoringChange: (val: boolean) => void;
  onAddAgentClick: () => void;
  onAddAnotherAgentClick: () => void;
  isDeploying: boolean;
}

export function AgentPolicyPanel({
  agentHostsMode,
  isPolicyCreated,
  isCredentialReady,
  isPolicyNameLoading,
  isPolicyFormValid,
  newAgentPolicy,
  withSysMonitoring,
  validation,
  policyOptions,
  selectedPolicyOptions,
  isPoliciesLoading,
  isEmpty,
  onHostsModeChange,
  onPoliciesChange,
  onAgentPolicyChange,
  onSysMonitoringChange,
  onAddAgentClick,
  onAddAnotherAgentClick,
  isDeploying,
}: AgentPolicyPanelProps) {
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

  const isAddAgentReady = !isPolicyNameLoading && isPolicyFormValid && isCredentialReady;

  return (
    <div data-test-subj="agentBasedSection-whereToAddPanel">
      {/* Hosts radio — always visible. Disabled after policy is created to avoid
          switching mode after a policy has been created (would strand it). */}
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
          onChange={(id) => onHostsModeChange(id as 'new' | 'existing')}
          disabled={isPolicyCreated}
          data-test-subj="agentBasedSection-hostsRadio"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* Existing policy selection combobox */}
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
              onChange={(selected) => onPoliciesChange(selected as PolicyOption[])}
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

      {/* New-policy mode: pre-create — show policy form + Add agent button */}
      {agentHostsMode === 'new' && !isPolicyCreated && (
        <>
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <LazyAgentPolicyIntegrationForm
              agentPolicy={newAgentPolicy}
              updateAgentPolicy={onAgentPolicyChange}
              withSysMonitoring={withSysMonitoring}
              updateSysMonitoring={onSysMonitoringChange}
              validation={validation}
            />
          </Suspense>
          <EuiSpacer size="m" />
          <EuiButton
            fill
            isDisabled={!isAddAgentReady || isDeploying}
            onClick={onAddAgentClick}
            data-test-subj="agentBasedSection-addAgentButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAgentButton"
              defaultMessage="Add agent"
            />
          </EuiButton>
        </>
      )}

      {/* New-policy mode: post-create — show policy summary + Add another agent button */}
      {agentHostsMode === 'new' && isPolicyCreated && (
        <>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.whereToAdd.created.description"
                defaultMessage="Agent policy {name} has been created."
                values={{ name: <strong>{newAgentPolicy.name}</strong> }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            onClick={onAddAnotherAgentClick}
            data-test-subj="agentBasedSection-addAnotherAgentButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.addAnotherAgentButton"
              defaultMessage="Add another agent"
            />
          </EuiButton>
        </>
      )}
    </div>
  );
}
