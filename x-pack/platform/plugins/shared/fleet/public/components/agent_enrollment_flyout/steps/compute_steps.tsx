/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { EuiSteps, EuiLoadingSpinner } from '@elastic/eui';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { getRootIntegrations, hasInstallServersInputs } from '../../../../common/services';

import { getGcpIntegrationDetailsFromAgentPolicy } from '../../cloud_security_posture/services';

import { StandaloneInstructions, ManualInstructions } from '../../enrollment_instructions';

import { useGetOneEnrollmentAPIKey, useStartServices, useAgentVersion } from '../../../hooks';
import { useFetchFullPolicy } from '../hooks';

import type { InstructionProps } from '../types';
import { usePollingAgentCount } from '../confirm_agent_enrollment';

import {
  InstallCloudFormationManagedAgentStep,
  InstallGoogleCloudShellManagedAgentStep,
  InstallAzureArmTemplateManagedAgentStep,
} from '../../cloud_security_posture';

import { getAgentPoliciesWithNonFipsIntegrations } from '../../../applications/fleet/hooks/use_agent_policies_with_fips';

import {
  InstallationModeSelectionStep,
  AgentEnrollmentKeySelectionStep,
  AgentPolicySelectionStep,
  InstallStandaloneAgentStep,
  ConfigureStandaloneAgentStep,
  AgentEnrollmentConfirmationStep,
  InstallManagedAgentStep,
  IncomingDataConfirmationStep,
} from '.';

export const StandaloneSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  selectedPolicyId,
  setSelectedPolicyId,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  isK8s,
  cloudSecurityIntegration,
  downloadSource,
  downloadSourceProxy,
}) => {
  const { yaml, onCreateApiKey, isCreatingApiKey, apiKey, downloadYaml } = useFetchFullPolicy(
    selectedPolicy,
    isK8s
  );

  const agentVersion = useAgentVersion();

  const instructionsSteps = useMemo(() => {
    const standaloneInstallCommands = StandaloneInstructions({
      agentVersion: agentVersion || '',
      downloadSource,
      downloadSourceProxy,
    });

    const steps: EuiContainedStepProps[] = !agentPolicy
      ? [
          AgentPolicySelectionStep({
            selectedPolicy,
            selectedPolicyId,
            agentPolicies,
            selectedApiKeyId,
            setSelectedAPIKeyId,
            setSelectedPolicyId,
            refreshAgentPolicies,
          }),
        ]
      : [];

    if (selectionType === 'radio') {
      steps.push(
        InstallationModeSelectionStep({ selectedPolicyId: selectedPolicy?.id, mode, setMode })
      );
    }

    steps.push(
      ConfigureStandaloneAgentStep({
        isK8s,
        selectedPolicyId: selectedPolicy?.id,
        yaml,
        downloadYaml,
        apiKey,
        onCreateApiKey,
        isCreatingApiKey,
      })
    );

    steps.push(
      InstallStandaloneAgentStep({
        installCommand: standaloneInstallCommands,
        isK8s,
        cloudSecurityIntegration,
        rootIntegrations: getRootIntegrations(selectedPolicy?.package_policies ?? []),
        nonFipsIntegrations: getAgentPoliciesWithNonFipsIntegrations(selectedPolicy),
      })
    );

    return steps;
  }, [
    agentVersion,
    downloadSource,
    downloadSourceProxy,
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedAPIKeyId,
    setSelectedPolicyId,
    selectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    isK8s,
    yaml,
    downloadYaml,
    apiKey,
    onCreateApiKey,
    isCreatingApiKey,
    cloudSecurityIntegration,
    mode,
    setMode,
  ]);

  if (!agentVersion) {
    return <EuiLoadingSpinner />;
  }

  return <EuiSteps steps={instructionsSteps} />;
};

export const ManagedSteps: React.FunctionComponent<InstructionProps> = ({
  agentPolicy,
  agentPolicies,
  selectedPolicy,
  selectedPolicyId,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  fleetServerHost,
  fleetServerHostConfig,
  fleetProxy,
  downloadSource,
  downloadSourceProxy,
  refreshAgentPolicies,
  mode,
  setMode,
  selectionType,
  onClickViewAgents,
  isK8s,
  cloudSecurityIntegration,
  installedPackagePolicy,
}) => {
  const core = useStartServices();
  const { docLinks } = core;
  const link = docLinks.links.fleet.troubleshooting;
  const [agentDataConfirmed, setAgentDataConfirmed] = useState<boolean>(false);

  const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
  const apiKeyData = apiKey?.data;
  const enrollToken = apiKey.data ? apiKey.data.item.api_key : '';

  const { enrolledAgentIds } = usePollingAgentCount(selectedPolicy?.id || '');

  const agentVersion = useAgentVersion();

  const { gcpProjectId, gcpOrganizationId, gcpAccountType } =
    getGcpIntegrationDetailsFromAgentPolicy(selectedPolicy);

  const showInstallServers = hasInstallServersInputs(agentPolicy?.package_policies ?? []);

  const installManagedCommands = ManualInstructions({
    apiKey: enrollToken,
    fleetServerHost,
    fleetServerHostConfig,
    fleetProxy,
    downloadSource,
    downloadSourceProxy,
    agentVersion: agentVersion || '',
    gcpProjectId,
    gcpOrganizationId,
    gcpAccountType,
    showInstallServers,
  });

  const instructionsSteps = useMemo(() => {
    const steps: EuiContainedStepProps[] = !agentPolicy
      ? [
          AgentPolicySelectionStep({
            selectedPolicy,
            selectedPolicyId,
            agentPolicies,
            selectedApiKeyId,
            setSelectedAPIKeyId,
            setSelectedPolicyId,
            refreshAgentPolicies,
          }),
        ]
      : [
          AgentEnrollmentKeySelectionStep({
            selectedPolicy,
            selectedApiKeyId,
            setSelectedAPIKeyId,
          }),
        ];

    if (selectionType === 'radio') {
      steps.push(
        InstallationModeSelectionStep({ selectedPolicyId: selectedPolicy?.id, mode, setMode })
      );
    }

    if (cloudSecurityIntegration?.isCloudFormation) {
      steps.push(
        InstallCloudFormationManagedAgentStep({
          apiKeyData,
          selectedApiKeyId,
          enrollToken,
          cloudSecurityIntegration,
          fleetServerHost,
        })
      );
    } else if (cloudSecurityIntegration?.cloudShellUrl) {
      steps.push(
        InstallGoogleCloudShellManagedAgentStep({
          apiKeyData,
          selectedApiKeyId,
          cloudShellUrl: cloudSecurityIntegration.cloudShellUrl,
          cloudShellCommand: installManagedCommands.googleCloudShell,
          projectId: gcpProjectId,
        })
      );
    } else if (cloudSecurityIntegration?.isAzureArmTemplate) {
      steps.push(
        InstallAzureArmTemplateManagedAgentStep({
          selectedApiKeyId,
          apiKeyData,
          enrollToken,
          cloudSecurityIntegration,
          agentPolicy,
        })
      );
    } else {
      steps.push(
        InstallManagedAgentStep({
          installCommand: installManagedCommands,
          apiKeyData,
          selectedApiKeyId,
          isK8s,
          cloudSecurityIntegration,
          fleetServerHost,
          enrollToken,
          rootIntegrations: getRootIntegrations(selectedPolicy?.package_policies ?? []),
          nonFipsIntegrations: getAgentPoliciesWithNonFipsIntegrations(selectedPolicy),
        })
      );
    }

    if (selectedApiKeyId && apiKeyData) {
      steps.push(
        AgentEnrollmentConfirmationStep({
          selectedPolicyId: selectedPolicy?.id,
          onClickViewAgents,
          troubleshootLink: link,
          agentCount: enrolledAgentIds.length,
          isLongEnrollment: cloudSecurityIntegration !== undefined,
        })
      );
    }
    if (selectedPolicy) {
      steps.push(
        IncomingDataConfirmationStep({
          agentIds: enrolledAgentIds,
          agentDataConfirmed,
          setAgentDataConfirmed,
          installedPolicy: installedPackagePolicy,
          troubleshootLink: link,
        })
      );
    }

    return steps;
  }, [
    agentPolicy,
    selectedPolicy,
    agentPolicies,
    selectedApiKeyId,
    setSelectedAPIKeyId,
    setSelectedPolicyId,
    selectedPolicyId,
    refreshAgentPolicies,
    selectionType,
    cloudSecurityIntegration,
    apiKeyData,
    mode,
    setMode,
    enrollToken,
    fleetServerHost,
    installManagedCommands,
    gcpProjectId,
    isK8s,
    onClickViewAgents,
    link,
    enrolledAgentIds,
    agentDataConfirmed,
    installedPackagePolicy,
  ]);

  if (!agentVersion) {
    return <EuiLoadingSpinner />;
  }

  return <EuiSteps steps={instructionsSteps} />;
};
