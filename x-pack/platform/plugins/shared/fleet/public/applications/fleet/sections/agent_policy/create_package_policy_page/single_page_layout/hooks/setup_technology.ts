/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';

import { useConfig } from '../../../../../hooks';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import type {
  AgentPolicy,
  NewAgentPolicy,
  NewPackagePolicy,
  PackageInfo,
} from '../../../../../types';
import { SetupTechnology } from '../../../../../types';
import { useStartServices } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';
import {
  isAgentlessIntegration as isAgentlessIntegrationFn,
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  isOnlyAgentlessIntegration,
} from '../../../../../../../../common/services/agentless_policy_helper';

export const useAgentless = () => {
  const config = useConfig();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;

  const isAgentlessEnabled = (isCloud || isServerless) && config.agentless?.enabled === true;
  const isAgentlessDefault = isAgentlessEnabled && config.agentless?.isDefault === true;
  const isAgentlessCustomIntegrationsEnabled =
    isAgentlessEnabled && config.agentless?.customIntegrations?.enabled === true;

  const isAgentlessAgentPolicy = (agentPolicy: AgentPolicy | undefined) => {
    if (!agentPolicy) return false;
    return isAgentlessEnabled && !!agentPolicy?.supports_agentless;
  };

  // When an integration has at least a policy template enabled for agentless
  const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
    const installSource =
      packageInfo &&
      'installationInfo' in packageInfo &&
      packageInfo.installationInfo?.install_source;
    const isCustomIntegration = installSource === 'custom' || installSource === 'upload';

    if (isCustomIntegration && !isAgentlessCustomIntegrationsEnabled) {
      return false;
    }

    if (isAgentlessEnabled && isAgentlessIntegrationFn(packageInfo)) {
      return true;
    }
    return false;
  };

  return {
    isAgentlessEnabled,
    isAgentlessDefault,
    isAgentlessAgentPolicy,
    isAgentlessIntegration,
    isServerless,
    isCloud,
  };
};

export function useSetupTechnology({
  setNewAgentPolicy,
  newAgentPolicy,
  updatePackagePolicy,
  setSelectedPolicyTab,
  packageInfo,
  packagePolicy,
  isEditPage,
  agentPolicies,
  integrationToEnable,
  hideAgentlessSelector,
}: {
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  newAgentPolicy: NewAgentPolicy;
  updatePackagePolicy: (policy: Partial<NewPackagePolicy>) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  packageInfo?: PackageInfo;
  packagePolicy: NewPackagePolicy;
  isEditPage?: boolean;
  agentPolicies?: AgentPolicy[];
  integrationToEnable?: string;
  hideAgentlessSelector?: boolean;
}) {
  const { isAgentlessEnabled, isAgentlessDefault } = useAgentless();

  // this is a placeholder for the new agent-BASED policy that will be used when the user switches from agentless to agent-based and back
  const orginalAgentPolicyRef = useRef<NewAgentPolicy>({ ...newAgentPolicy });
  const [currentAgentPolicy, setCurrentAgentPolicy] = useState(newAgentPolicy);

  const allowedSetupTechnologies = useMemo(() => {
    const setupTechnologies = [];

    if (isAgentlessIntegrationFn(packageInfo, integrationToEnable)) {
      setupTechnologies.push(SetupTechnology.AGENTLESS);
    }

    if (!isOnlyAgentlessIntegration(packageInfo, integrationToEnable)) {
      setupTechnologies.push(SetupTechnology.AGENT_BASED);
    }

    return setupTechnologies;
  }, [integrationToEnable, packageInfo]);
  const [selectedSetupTechnology, setSelectedSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  // derive default setup technology based on package info and selected integration
  const [defaultSetupTechnology, setDefaultSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  useEffect(() => {
    const shouldBeDefault =
      isAgentlessEnabled &&
      !hideAgentlessSelector &&
      (isOnlyAgentlessIntegration(packageInfo, integrationToEnable) ||
        isAgentlessSetupDefault(isAgentlessDefault, packageInfo, integrationToEnable))
        ? SetupTechnology.AGENTLESS
        : SetupTechnology.AGENT_BASED;
    setDefaultSetupTechnology(shouldBeDefault);
    setSelectedSetupTechnology(shouldBeDefault);
  }, [
    isAgentlessEnabled,
    isAgentlessDefault,
    packageInfo,
    integrationToEnable,
    hideAgentlessSelector,
  ]);

  const agentlessPolicyName = getAgentlessAgentPolicyNameFromPackagePolicyName(packagePolicy.name);

  const handleSetupTechnologyChange = useCallback(
    (setupTechnology: SetupTechnology) => {
      if (!isAgentlessEnabled || setupTechnology === selectedSetupTechnology) {
        return;
      }
      setSelectedPolicyTab(SelectedPolicyTab.NEW);
      setSelectedSetupTechnology(setupTechnology);
    },
    [isAgentlessEnabled, selectedSetupTechnology, setSelectedPolicyTab, setSelectedSetupTechnology]
  );
  if (
    isEditPage &&
    agentPolicies &&
    agentPolicies.some((policy) => policy.supports_agentless) &&
    selectedSetupTechnology === SetupTechnology.AGENT_BASED
  ) {
    setSelectedSetupTechnology(SetupTechnology.AGENTLESS);
  }

  if (
    !isEditPage &&
    packagePolicy &&
    isAgentlessEnabled &&
    selectedSetupTechnology === SetupTechnology.AGENTLESS &&
    (!currentAgentPolicy.supports_agentless || agentlessPolicyName !== currentAgentPolicy.name)
  ) {
    const nextNewAgentlessPolicy = generateNewAgentPolicyWithDefaults({
      name: agentlessPolicyName,
      supports_agentless: true,
    });

    setCurrentAgentPolicy(nextNewAgentlessPolicy);
    setNewAgentPolicy(nextNewAgentlessPolicy as NewAgentPolicy);
    updatePackagePolicy({
      supports_agentless: true,
    });
  }

  if (
    !isEditPage &&
    selectedSetupTechnology === SetupTechnology.AGENT_BASED &&
    (currentAgentPolicy.supports_agentless || packagePolicy.supports_agentless)
  ) {
    const nextNewAgentlessPolicy = {
      ...orginalAgentPolicyRef.current,
      supports_agentless: false,
    };
    setCurrentAgentPolicy(nextNewAgentlessPolicy);
    setNewAgentPolicy(nextNewAgentlessPolicy);
    updatePackagePolicy({
      supports_agentless: false,
    });
  }

  return {
    handleSetupTechnologyChange,
    allowedSetupTechnologies,
    selectedSetupTechnology,
    defaultSetupTechnology,
  };
}

export const isAgentlessSetupDefault = (
  isAgentlessDefault: boolean,
  packageInfo?: PackageInfo,
  integrationToEnable?: string
): boolean => {
  const policyTemplates = packageInfo?.policy_templates ?? [];
  if (policyTemplates.length === 0) {
    return false;
  }

  const hasDefaultAgentlessIntegration =
    integrationToEnable &&
    policyTemplates.find((p) => p.name === integrationToEnable)?.deployment_modes?.agentless
      ?.is_default;
  if (hasDefaultAgentlessIntegration) {
    return true;
  }

  const allPolicyTemplatesAreDefaultAgentless = policyTemplates.every(
    (template) => template.deployment_modes?.agentless?.is_default
  );
  if (allPolicyTemplatesAreDefaultAgentless) {
    return true;
  }

  if (isAgentlessDefault) {
    const allPolicyTemplatesHaveAgentlessDefined = policyTemplates.every(
      (template) => template.deployment_modes?.agentless
    );
    if (allPolicyTemplatesHaveAgentlessDefined) {
      return true;
    }
  }

  return false;
};
