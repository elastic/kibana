/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import React from 'react';

import type {
  FlyoutMode,
  SelectionType,
} from '../../../../../../../components/agent_enrollment_flyout/types';
import { useAgentEnrollmentFlyoutData, useFleetServerHostsForPolicy } from '../../../../../hooks';
import {
  useAgentPolicyWithPackagePolicies,
  useCloudSecurityIntegration,
  useIsK8sPolicy,
} from '../../../../../../../components/agent_enrollment_flyout/hooks';
import { usePollingAgentCount } from '../../../../../../../components/agent_enrollment_flyout/confirm_agent_enrollment';
import type { PackagePolicy } from '../../../../../types';
import { FLEET_SERVER_PACKAGE } from '../../../../../constants';
import { Instructions, Loading } from '../../../../../components';
import type { EmbeddedIntegrationStepsLayoutProps } from '../types';

export const AgentEnrollmentFromOnboardingHub = ({
  agentPolicy,
  selectedAgentPolicies,
  isManaged,
  from,
  onNext,
  setEnrolledAgentIds,
  steps,
}: EmbeddedIntegrationStepsLayoutProps) => {
  const [selectedPolicyId, setSelectedPolicyId] = useState(agentPolicy?.id);
  const [isFleetServerPolicySelected, setIsFleetServerPolicySelected] = useState<boolean>(false);
  const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();
  const [mode, setMode] = useState<FlyoutMode>(isManaged ? 'managed' : 'standalone');
  const [selectionType, setSelectionType] = useState<SelectionType>();

  const {
    agentPolicies: fetchedAgentPolicies,
    isLoadingInitialAgentPolicies,
    isLoadingAgentPolicies,
    refreshAgentPolicies,
  } = useAgentEnrollmentFlyoutData();

  // Have the option to pass agentPolicies from props, otherwise use the fetched ones
  const agentPolicies = selectedAgentPolicies ? selectedAgentPolicies : fetchedAgentPolicies;

  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(selectedPolicyId);

  const { fleetServerHost, fleetProxy, downloadSource, downloadSourceProxy } =
    useFleetServerHostsForPolicy(agentPolicyWithPackagePolicies);

  const selectedPolicy = agentPolicyWithPackagePolicies
    ? agentPolicyWithPackagePolicies
    : undefined;

  const { enrolledAgentIds } = usePollingAgentCount(selectedPolicyId || '', {
    noLowerTimeLimit: true,
    pollImmediately: true,
  });

  const onClickViewIncomingData = useCallback(() => {
    setEnrolledAgentIds(enrolledAgentIds);
    onNext({ toStep: steps.length - 1 });
  }, [enrolledAgentIds, onNext, setEnrolledAgentIds, steps.length]);

  const handleAddFleetServer = useCallback(() => {
    setEnrolledAgentIds(enrolledAgentIds);
    onNext();
  }, [enrolledAgentIds, onNext, setEnrolledAgentIds]);

  useEffect(() => {
    if (selectedPolicy) {
      if (
        (selectedPolicy.package_policies as PackagePolicy[]).some(
          (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
        )
      ) {
        setIsFleetServerPolicySelected(true);
      } else {
        setIsFleetServerPolicySelected(false);
      }
    }
  }, [selectedPolicy, isFleetServerPolicySelected]);

  const { isK8s } = useIsK8sPolicy(selectedPolicy ?? undefined);
  const { cloudSecurityIntegration } = useCloudSecurityIntegration(selectedPolicy ?? undefined);

  return isLoadingInitialAgentPolicies || isLoadingAgentPolicies ? (
    <Loading size="l" />
  ) : (
    <Instructions
      fleetServerHost={fleetServerHost}
      fleetProxy={fleetProxy}
      downloadSource={downloadSource}
      downloadSourceProxy={downloadSourceProxy}
      setSelectedPolicyId={setSelectedPolicyId}
      agentPolicy={agentPolicy}
      selectedPolicy={selectedPolicy}
      agentPolicies={agentPolicies}
      isFleetServerPolicySelected={isFleetServerPolicySelected}
      isK8s={isK8s}
      cloudSecurityIntegration={cloudSecurityIntegration}
      refreshAgentPolicies={refreshAgentPolicies}
      isLoadingAgentPolicies={isLoadingAgentPolicies}
      mode={mode}
      setMode={setMode}
      selectionType={selectionType}
      setSelectionType={setSelectionType}
      selectedApiKeyId={selectedApiKeyId}
      setSelectedAPIKeyId={setSelectedAPIKeyId}
      onClickViewIncomingData={onClickViewIncomingData}
      from={from}
      handleAddFleetServer={handleAddFleetServer}
    />
  );
};
