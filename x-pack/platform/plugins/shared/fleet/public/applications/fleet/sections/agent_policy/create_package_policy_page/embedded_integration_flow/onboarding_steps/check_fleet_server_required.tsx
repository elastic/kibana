/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  useFleetServerStandalone,
  useFleetStatus,
  useGetEnrollmentSettings,
} from '../../../../../hooks';

import { shouldShowFleetServerEnrollment } from '../../../../../components';
import type { EmbeddedIntegrationStepsLayoutProps } from '../types';
import { useAgentPolicyWithPackagePolicies } from '../../../../../../../components/agent_enrollment_flyout/hooks';
import { FleetServerRequirementPage } from '../../../../agents/agent_requirements_page';
import type { PackagePolicy } from '../../../../../types';
import { FLEET_SERVER_PACKAGE } from '../../../../../constants';

export const CheckFleetServerRequiredFromOnboardingHub: React.FC<
  EmbeddedIntegrationStepsLayoutProps
> = ({ agentPolicy, isManaged, setIsManaged, onNext, currentStep }) => {
  const [isFleetServerPolicySelected, setIsFleetServerPolicySelected] = useState<boolean>(false);

  const fleetStatus = useFleetStatus();
  const { isFleetServerStandalone } = useFleetServerStandalone();
  const { data: enrollmentSettings } = useGetEnrollmentSettings();

  const showFleetServerEnrollment = shouldShowFleetServerEnrollment({
    isFleetServerStandalone,
    isFleetServerPolicySelected,
    enrollmentSettings,
    fleetStatusMissingRequirements: fleetStatus.missingRequirements,
  });

  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(agentPolicy?.id);

  const selectedPolicy = agentPolicyWithPackagePolicies
    ? agentPolicyWithPackagePolicies
    : undefined;

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

  useEffect(() => {
    // If the user is standalone, skip the Fleet Server enrollment step
    // If the user is managed and the Fleet Server enrollment is done, skip the Fleet Server enrollment step
    if ((!isManaged && showFleetServerEnrollment) || (isManaged && !showFleetServerEnrollment)) {
      onNext({ toStep: currentStep + 2 });
    }
  }, [currentStep, isManaged, onNext, showFleetServerEnrollment]);

  if (isManaged && showFleetServerEnrollment) {
    return (
      <FleetServerRequirementPage
        showStandaloneTab={() => {
          setIsManaged(false);
          onNext({ toStep: currentStep + 2 });
        }}
        handleAddFleetServer={() => {
          onNext();
        }}
      />
    );
  }

  return null;
};
