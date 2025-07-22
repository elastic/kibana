/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';

import { useConfig, sendGetOneFleetServerHost, sendGetOneOutput } from '../../../../../hooks';
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
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
  AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT,
  AGENTLESS_AGENT_POLICY_MONITORING,
  SERVERLESS_DEFAULT_OUTPUT_ID,
  DEFAULT_OUTPUT_ID,
  SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID,
  DEFAULT_FLEET_SERVER_HOST_ID,
} from '../../../../../../../../common/constants';
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
  const { isAgentlessEnabled, isAgentlessDefault, isServerless, isCloud } = useAgentless();

  // this is a placeholder for the new agent-BASED policy that will be used when the user switches from agentless to agent-based and back
  const orginalAgentPolicyRef = useRef<NewAgentPolicy>({ ...newAgentPolicy });
  const [currentAgentPolicy, setCurrentAgentPolicy] = useState(newAgentPolicy);

  const allowedSetupTechnologies = useMemo(() => {
    return isOnlyAgentlessIntegration(packageInfo, integrationToEnable)
      ? [SetupTechnology.AGENTLESS]
      : [SetupTechnology.AGENTLESS, SetupTechnology.AGENT_BASED];
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
  const [agentlessPolicyOutputId, setAgentlessPolicyOutputId] = useState<string | undefined>();
  const [agentlessPolicyFleetServerHostId, setAgentlessPolicyFleetServerHostId] = useState<
    string | undefined
  >();

  useEffect(() => {
    const fetchOutputId = async () => {
      const outputId = isServerless
        ? SERVERLESS_DEFAULT_OUTPUT_ID
        : isCloud
        ? DEFAULT_OUTPUT_ID
        : undefined;
      if (outputId) {
        const outputData = await sendGetOneOutput(outputId);
        setAgentlessPolicyOutputId(outputData.data?.item ? outputId : undefined);
      } else {
        setAgentlessPolicyOutputId(undefined);
      }
    };
    const fetchFleetServerHostId = async () => {
      const hostId = isServerless
        ? SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID
        : isCloud
        ? DEFAULT_FLEET_SERVER_HOST_ID
        : undefined;

      if (hostId) {
        const hostData = await sendGetOneFleetServerHost(hostId);
        setAgentlessPolicyFleetServerHostId(hostData.data?.item ? hostId : undefined);
      } else {
        setAgentlessPolicyFleetServerHostId(undefined);
      }
    };

    fetchOutputId();
    fetchFleetServerHostId();
  }, [isCloud, isServerless]);

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
    const nextNewAgentlessPolicy = {
      ...generateNewAgentPolicyWithDefaults({
        inactivity_timeout: AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT,
        supports_agentless: true,
        monitoring_enabled: AGENTLESS_AGENT_POLICY_MONITORING,
        ...(agentlessPolicyOutputId ? { data_output_id: agentlessPolicyOutputId } : {}),
        ...(agentlessPolicyFleetServerHostId
          ? { fleet_server_host_id: agentlessPolicyFleetServerHostId }
          : {}),
      }),
      name: agentlessPolicyName,
      global_data_tags: getGlobaDataTags(packageInfo),
    };

    const agentlessPolicy = getAgentlessPolicy(packageInfo);
    if (agentlessPolicy) {
      nextNewAgentlessPolicy.agentless = agentlessPolicy;
    }

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

const getGlobaDataTags = (packageInfo?: PackageInfo) => {
  if (
    !packageInfo?.policy_templates &&
    !packageInfo?.policy_templates?.some((policy) => policy.deployment_modes)
  ) {
    return undefined;
  }
  const agentlessPolicyTemplate = packageInfo.policy_templates.find(
    (policy) => policy.deployment_modes
  );

  // assumes that all the policy templates agentless deployments modes indentify have the same organization, division and team
  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;
  if (
    agentlessInfo === undefined ||
    !agentlessInfo.organization ||
    !agentlessInfo.division ||
    !agentlessInfo.team
  ) {
    return undefined;
  }

  return [
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
      value: agentlessInfo.organization,
    },
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
      value: agentlessInfo.division,
    },
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_TEAM,
      value: agentlessInfo.team,
    },
  ];
};

const getAgentlessPolicy = (packageInfo?: PackageInfo) => {
  if (
    !packageInfo?.policy_templates &&
    !packageInfo?.policy_templates?.some((policy) => policy.deployment_modes)
  ) {
    return;
  }
  const agentlessPolicyTemplate = packageInfo.policy_templates.find(
    (policy) => policy.deployment_modes
  );

  // assumes that all the policy templates agentless deployments modes indentify have the same organization, division and team
  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;

  if (!agentlessInfo?.resources) {
    return;
  }

  return {
    resources: agentlessInfo.resources,
  };
};
