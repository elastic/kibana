/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { splitPkgKey } from '../../../../../../../common/services';

import {
  useGetPackageInfoByKeyQuery,
  useFleetServerHostsForPolicy,
  useStartServices,
} from '../../../../hooks';

import { useIntegrationsStateContext } from '../../../../../integrations/hooks';

import type { AgentPolicy } from '../../../../types';
import { useGetAgentPolicyOrDefault } from '../multi_page_layout/hooks';
import { Loading } from '../../../../components';

import { onboardingManagedSteps } from './onboarding_steps';

import { EmbeddedIntegrationStepsLayout } from './embedded_integration_steps_layout';
import type { EmbeddedIntegrationFlowProps } from './types';

export const EmbeddedIntegrationFlow: React.FC<EmbeddedIntegrationFlowProps> = ({
  prerelease,
  integrationName: integration,
  onStepNext,
  onCancel,
  handleViewAssets,
  from,
}) => {
  const { notifications } = useStartServices();

  const { pkgkey: pkgKeyContext } = useIntegrationsStateContext();
  const pkgkey = pkgKeyContext || '';
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
  const [enrolledAgentIds, setEnrolledAgentIds] = useState<string[]>([]);
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<AgentPolicy[]>();
  const toggleIsManaged = (newIsManaged: boolean) => {
    setIsManaged(newIsManaged);
    setCurrentStep(0);
  };

  const agentPolicyId = useMemo(() => selectedAgentPolicies?.[0]?.id, [selectedAgentPolicies]);
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKeyQuery(pkgName, pkgVersion, { prerelease, full: true });

  const {
    agentPolicy,
    enrollmentAPIKey,
    error: agentPolicyError,
    isLoading: isAgentPolicyLoading,
  } = useGetAgentPolicyOrDefault(agentPolicyId);

  const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);

  const integrationInfo = useMemo(() => {
    if (!integration) return;
    return packageInfo?.policy_templates?.find(
      (policyTemplate) => policyTemplate.name === integration
    );
  }, [packageInfo?.policy_templates, integration]);

  const { fleetServerHost, fleetProxy, downloadSource } = useFleetServerHostsForPolicy(agentPolicy);

  const stepsNext = useCallback(
    (props?: { selectedAgentPolicies?: AgentPolicy[]; toStep?: number }) => {
      if (currentStep === onboardingManagedSteps.length - 1) {
        return;
      }

      setCurrentStep(props?.toStep ?? currentStep + 1);
      onStepNext?.(props?.toStep ?? currentStep + 1);

      // selected agent policy is set after integration is configured
      if (props?.selectedAgentPolicies) {
        setSelectedAgentPolicies(props?.selectedAgentPolicies);
      }
    },
    [currentStep, onStepNext]
  );

  const stepsBack = () => {
    if (currentStep === 0) {
      return;
    }

    setCurrentStep(currentStep - 1);
  };

  useEffect(() => {
    if (!isPackageInfoLoading && packageInfoError) {
      notifications.toasts.addError(packageInfoError, {
        title: i18n.translate('xpack.fleet.createPackagePolicy.errorLoadingPackageTitle', {
          defaultMessage: 'Error loading package information',
        }),
        toastMessage: packageInfoError.message,
      });
    }
  }, [isPackageInfoLoading, notifications.toasts, packageInfoError]);

  useEffect(() => {
    if (!isAgentPolicyLoading && agentPolicyError) {
      notifications.toasts.addError(agentPolicyError, {
        title: i18n.translate('xpack.fleet.createPackagePolicy.errorLoadingAgentPolicyTitle', {
          defaultMessage: 'Error loading agent policy information',
        }),
        toastMessage: agentPolicyError.message,
      });
    }
  }, [isAgentPolicyLoading, notifications.toasts, agentPolicyError]);

  return !isPackageInfoLoading && packageInfo ? (
    <EmbeddedIntegrationStepsLayout
      fleetServerHost={fleetServerHost}
      fleetProxy={fleetProxy}
      downloadSource={downloadSource}
      agentPolicy={selectedAgentPolicies?.[0] ?? agentPolicy}
      enrollmentAPIKey={enrollmentAPIKey}
      currentStep={currentStep}
      steps={onboardingManagedSteps}
      packageInfo={packageInfo}
      integrationInfo={integrationInfo}
      onNext={stepsNext}
      onBack={stepsBack}
      isManaged={isManaged}
      setIsManaged={toggleIsManaged}
      setEnrolledAgentIds={setEnrolledAgentIds}
      enrolledAgentIds={enrolledAgentIds}
      onCancel={onCancel}
      prerelease={prerelease}
      handleViewAssets={handleViewAssets}
      from={from}
      selectedAgentPolicies={selectedAgentPolicies}
    />
  ) : (
    <Loading />
  );
};
