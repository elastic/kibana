/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { load } from 'js-yaml';
import { isEqual, omit, pick } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

import { inputsFormat } from '../../../../../../../../common/constants';
import {
  formatInputs,
  formatVars,
} from '../../../../../../../../common/services/simplified_package_policy_helper';

import { sendCreateAgentlessPolicy } from '../../../../../../../hooks/use_request/agentless_policy';

import {
  AgentlessAgentCreateFleetUnreachableError,
  AgentlessAgentCreateOverProvisionedError,
} from '../../../../../../../../common/errors';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import type { CloudProvider } from '../../../../../types';
import {
  type AgentPolicy,
  type NewPackagePolicy,
  type NewAgentPolicy,
  type CreatePackagePolicyRequest,
  type PackagePolicy,
  type PackageInfo,
  SetupTechnology,
} from '../../../../../types';
import {
  useStartServices,
  sendCreateAgentPolicy,
  sendBulkInstallPackages,
  sendGetPackagePolicies,
  useMultipleAgentPolicies,
  useFleetStatus,
  sendCreatePackagePolicyForRq,
} from '../../../../../hooks';
import { isVerificationError, packageToPackagePolicy } from '../../../../../services';
import type {
  CreatePackagePolicyResponse,
  NewPackagePolicyInput,
} from '../../../../../../../../common';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../../../../../common';
import { getMaxPackageName } from '../../../../../../../../common/services';
import { isInputAllowedForDeploymentMode } from '../../../../../../../../common/services/agentless_policy_helper';
import { useConfirmForceInstall } from '../../../../../../integrations/hooks';
import { validatePackagePolicy, validationHasErrors } from '../../services';
import type { PackagePolicyValidationResults } from '../../services';
import type { PackagePolicyFormState } from '../../types';
import { SelectedPolicyTab } from '../../components';
import { useOnSaveNavigate } from '../../hooks';
import { prepareInputPackagePolicyDataset } from '../../services/prepare_input_pkg_policy_dataset';
import {
  getAzureArmPropsFromPackagePolicy,
  getCloudFormationPropsFromPackagePolicy,
  getCloudShellUrlFromPackagePolicy,
} from '../../../../../../../components/cloud_security_posture/services';
import { ensurePackageKibanaAssetsInstalled } from '../../../../../services/ensure_kibana_assets_installed';

import { useAgentless, useSetupTechnology } from './setup_technology';

const DEFAULT_AGENTLESS_LIMIT = 5;

export async function createAgentPolicy({
  packagePolicy,
  newAgentPolicy,
  withSysMonitoring,
}: {
  packagePolicy: NewPackagePolicy;
  newAgentPolicy: NewAgentPolicy;
  withSysMonitoring: boolean;
}): Promise<AgentPolicy> {
  // do not create agent policy with system integration if package policy already is for system package
  const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;
  const resp = await sendCreateAgentPolicy(newAgentPolicy, {
    withSysMonitoring: withSysMonitoring && !packagePolicyIsSystem,
  });
  if (resp.error) {
    throw resp.error;
  }
  if (!resp.data) {
    throw new Error('Invalid agent policy creation no data');
  }
  return resp.data.item;
}

export const createAgentPolicyIfNeeded = async ({
  selectedPolicyTab,
  withSysMonitoring,
  newAgentPolicy,
  packagePolicy,
  packageInfo,
}: {
  selectedPolicyTab: SelectedPolicyTab;
  withSysMonitoring: boolean;
  newAgentPolicy: NewAgentPolicy;
  packagePolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
}): Promise<AgentPolicy | undefined> => {
  if (selectedPolicyTab === SelectedPolicyTab.NEW) {
    if ((withSysMonitoring || newAgentPolicy.monitoring_enabled?.length) ?? 0 > 0) {
      const packagesToPreinstall: Array<string | { name: string; version: string }> = [];
      // skip preinstall of input package, to be able to rollback when package policy creation fails
      if (packageInfo && packageInfo.type !== 'input') {
        packagesToPreinstall.push({ name: packageInfo.name, version: packageInfo.version });
      }
      if (withSysMonitoring) {
        packagesToPreinstall.push(FLEET_SYSTEM_PACKAGE);
      }
      if (newAgentPolicy.monitoring_enabled?.length ?? 0 > 0) {
        packagesToPreinstall.push(FLEET_ELASTIC_AGENT_PACKAGE);
      }

      if (packagesToPreinstall.length > 0) {
        await sendBulkInstallPackages([...new Set(packagesToPreinstall)]);
      }
    }

    // Skip policy creation for agentless as it's done through agentless_policies API
    if (newAgentPolicy.supports_agentless) {
      return;
    }

    return await createAgentPolicy({
      newAgentPolicy,
      packagePolicy,
      withSysMonitoring,
    });
  }
};

async function savePackagePolicy(pkgPolicy: CreatePackagePolicyRequest['body']) {
  const { policy, forceCreateNeeded } = await prepareInputPackagePolicyDataset(pkgPolicy);

  // If agentless use agentless policies API
  if (policy.supports_agentless) {
    function formatPackage(pkg: NewPackagePolicy['package']) {
      return omit(pkg, 'title');
    }

    const agentlessRequestBody = {
      package: formatPackage(pkgPolicy.package),
      ...omit(
        pkgPolicy,
        'policy_ids',
        'package',
        'enabled',
        'inputs',
        'vars',
        'id',
        'supports_agentless',
        'supports_cloud_connector',
        'cloud_connector_id',
        'cloud_connector_name'
      ),
      id: pkgPolicy.id ? String(pkgPolicy.id) : undefined,
      inputs: formatInputs(pkgPolicy.inputs),
      vars: formatVars(pkgPolicy.vars),
      // Build cloud_connector object if cloud connectors are supported
      ...(pkgPolicy.supports_cloud_connector && {
        cloud_connector: {
          enabled: true,
          ...(pkgPolicy.cloud_connector_id && {
            cloud_connector_id: pkgPolicy.cloud_connector_id,
          }),
          // Only pass the name if creating a new connector (no cloud_connector_id)
          ...(!pkgPolicy.cloud_connector_id &&
            pkgPolicy.cloud_connector_name && {
              name: pkgPolicy.cloud_connector_name,
            }),
        },
      }),
    };

    const result = await sendCreateAgentlessPolicy(agentlessRequestBody, {
      format: inputsFormat.Legacy,
    });

    return result as CreatePackagePolicyResponse;
  }

  const result = await sendCreatePackagePolicyForRq({
    ...policy,
    ...(forceCreateNeeded && { force: true }),
  });

  return result;
}
// Update the agentless policy with cloud connector info in the new agent policy when the package policy input `aws.support_cloud_connectors is updated
export const updateAgentlessCloudConnectorConfig = (
  packagePolicy: NewPackagePolicy,
  newAgentPolicy: NewAgentPolicy,
  setNewAgentPolicy: (policy: NewAgentPolicy) => void,
  setPackagePolicy: (policy: NewPackagePolicy) => void
) => {
  const input = packagePolicy.inputs?.find(
    (pinput: NewPackagePolicyInput) => pinput.enabled === true
  );
  const targetCsp = input?.type.match(/aws|azure/)?.[0];

  // Making sure that the cloud connector is disabled when switching to GCP
  if (
    !targetCsp &&
    (newAgentPolicy.agentless?.cloud_connectors || packagePolicy.supports_cloud_connector)
  ) {
    setNewAgentPolicy({
      ...newAgentPolicy,
      agentless: {
        ...newAgentPolicy.agentless,
        cloud_connectors: undefined,
      },
    });

    setPackagePolicy({
      ...packagePolicy,
      supports_cloud_connector: false,
    });
    return;
  }

  const cloudConnectorPolicyEnabled: boolean = !!packagePolicy.supports_cloud_connector;
  const cloudConnectorPolicyMismatch =
    newAgentPolicy.agentless?.cloud_connectors?.enabled !== cloudConnectorPolicyEnabled;

  if (
    targetCsp &&
    newAgentPolicy?.supports_agentless &&
    (cloudConnectorPolicyMismatch ||
      newAgentPolicy.agentless?.cloud_connectors?.target_csp !== targetCsp)
  ) {
    setNewAgentPolicy({
      ...newAgentPolicy,
      agentless: {
        ...newAgentPolicy.agentless,
        cloud_connectors: {
          enabled: cloudConnectorPolicyEnabled,
          target_csp: targetCsp as CloudProvider,
        },
      },
    });

    setPackagePolicy({
      ...packagePolicy,
      supports_cloud_connector: cloudConnectorPolicyEnabled,
    });
  }
};

const DEFAULT_PACKAGE_POLICY = {
  name: '',
  description: '',
  namespace: '',
  policy_id: '',
  policy_ids: [''],
  enabled: true,
  inputs: [],
};

export function useOnSubmit({
  agentCount,
  selectedPolicyTab,
  newAgentPolicy,
  withSysMonitoring,
  queryParamsPolicyId,
  packageInfo,
  integrationToEnable,
  hasFleetAddAgentsPrivileges,
  setNewAgentPolicy,
  setSelectedPolicyTab,
  isAddIntegrationFlyout,
  defaultPolicyData,
}: {
  packageInfo?: PackageInfo;
  newAgentPolicy: NewAgentPolicy;
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  agentCount: number;
  queryParamsPolicyId: string | undefined;
  integrationToEnable?: string;
  hasFleetAddAgentsPrivileges: boolean;
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
  isAddIntegrationFlyout?: boolean;
  defaultPolicyData?: Partial<NewPackagePolicy>;
}) {
  const { notifications, docLinks } = useStartServices();
  const { spaceId } = useFleetStatus();
  const confirmForceInstall = useConfirmForceInstall();
  const spaceSettings = useSpaceSettingsContext();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  // only used to store the resulting package policy once saved
  const [savedPackagePolicy, setSavedPackagePolicy] = useState<PackagePolicy>();
  // Form state
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');

  // Used to render extension components only when package policy is initialized
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const isFetchingBasePackage = useRef<boolean>(false);

  const [agentPolicies, setAgentPolicies] = useState<AgentPolicy[]>([]);
  // New package policy state
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    ...DEFAULT_PACKAGE_POLICY,
  });
  const [integration, setIntegration] = useState<string | undefined>(integrationToEnable);

  // Validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);

  const { isAgentlessIntegration, isAgentlessAgentPolicy } = useAgentless();

  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update agent policy method
  const updateAgentPolicies = useCallback(
    (updatedAgentPolicies: AgentPolicy[]) => {
      if (isEqual(updatedAgentPolicies, agentPolicies)) {
        return;
      }

      setAgentPolicies(updatedAgentPolicies);
      if (packageInfo) {
        setHasAgentPolicyError(false);
      }
    },
    [packageInfo, agentPolicies]
  );
  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: NewPackagePolicy) => {
      if (packageInfo) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo,
          load,
          spaceSettings
        );
        setValidationResults(newValidationResult);

        return newValidationResult;
      }
    },
    [packagePolicy, packageInfo, spaceSettings]
  );
  // Update package policy method
  const updatePackagePolicy = useCallback(
    (updatedFields: Partial<NewPackagePolicy>) => {
      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      };
      setPackagePolicy(newPackagePolicy);

      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasPackage = newPackagePolicy.package;
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      const hasAgentPolicy =
        (newPackagePolicy.policy_ids.length > 0 && newPackagePolicy.policy_ids[0] !== '') ||
        selectedPolicyTab === SelectedPolicyTab.NEW;
      const isOrphaningPolicy =
        canUseMultipleAgentPolicies && newPackagePolicy.policy_ids.length === 0;
      if (hasPackage && (hasAgentPolicy || isOrphaningPolicy) && !hasValidationErrors) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation, selectedPolicyTab, canUseMultipleAgentPolicies]
  );

  // Initial loading of package info
  useEffect(() => {
    async function init() {
      if (
        !packageInfo ||
        (packageInfo.name === packagePolicy.package?.name && integrationToEnable === integration)
      ) {
        return;
      }
      if (integrationToEnable !== integration) {
        setIntegration(integrationToEnable);
      }

      // Fetch all packagePolicies having the package name
      if (!isFetchingBasePackage.current) {
        // Prevent multiple calls to fetch base package
        isFetchingBasePackage.current = true;
        const { data: packagePolicyData } = await sendGetPackagePolicies({
          perPage: SO_SEARCH_LIMIT,
          page: 1,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageInfo.name}`,
        });
        const incrementedName = getMaxPackageName(packageInfo.name, packagePolicyData?.items);

        const basePackagePolicy = packageToPackagePolicy(
          packageInfo,
          agentPolicies.map((policy) => policy.id),
          '',
          DEFAULT_PACKAGE_POLICY.name || incrementedName,
          DEFAULT_PACKAGE_POLICY.description,
          integrationToEnable
        );

        if (defaultPolicyData) {
          Object.assign(
            basePackagePolicy,
            pick(
              defaultPolicyData,
              'name',
              'description',
              'namespace',
              'policy_ids',
              'output_id',
              'cloud_connector_id',
              'cloud_connector_name',
              'inputs',
              'vars',
              'elasticsearch',
              'overrides',
              'supports_agentless',
              'supports_cloud_connector',
              'additional_datastreams_permissions'
            )
          );
        }

        // Set the package policy with the fetched package
        updatePackagePolicy(basePackagePolicy);
        setIsInitialized(true);
        isFetchingBasePackage.current = false;
      }
    }
    if (!isInitialized || isAddIntegrationFlyout) {
      // Fetch agent policies
      init();
    }
  }, [
    isFetchingBasePackage,
    packageInfo,
    agentPolicies,
    updatePackagePolicy,
    integrationToEnable,
    isInitialized,
    packagePolicy.package?.name,
    integration,
    setIntegration,
    isAddIntegrationFlyout,
    defaultPolicyData,
    setSelectedPolicyTab,
  ]);

  useEffect(() => {
    if (
      (canUseMultipleAgentPolicies || agentPolicies.length > 0) &&
      !isEqual(
        agentPolicies.map((policy) => policy.id),
        packagePolicy.policy_ids
      )
    ) {
      updatePackagePolicy({
        policy_ids: agentPolicies.map((policy) => policy.id),
      });
    }
  }, [packagePolicy, agentPolicies, updatePackagePolicy, canUseMultipleAgentPolicies]);

  const {
    handleSetupTechnologyChange,
    allowedSetupTechnologies,
    selectedSetupTechnology,
    defaultSetupTechnology,
  } = useSetupTechnology({
    newAgentPolicy,
    setNewAgentPolicy,
    updatePackagePolicy,
    setSelectedPolicyTab,
    packageInfo,
    packagePolicy,
    integrationToEnable,
    hideAgentlessSelector: isAddIntegrationFlyout,
  });
  const setupTechnologyRef = useRef<SetupTechnology | undefined>(selectedSetupTechnology);
  // sync the inputs with the agentless selector change
  useEffect(() => {
    setupTechnologyRef.current = selectedSetupTechnology;
  });
  const prevSetupTechnology = setupTechnologyRef.current;
  const isAgentlessSelected =
    isAgentlessIntegration(packageInfo) && selectedSetupTechnology === SetupTechnology.AGENTLESS;

  const newInputs = useMemo(() => {
    return packagePolicy.inputs.map((input, i) => {
      if (
        isInputAllowedForDeploymentMode(
          input,
          isAgentlessSelected ? 'agentless' : 'default',
          packageInfo
        )
      ) {
        return input;
      } else {
        return { ...input, enabled: false };
      }
    });
  }, [packagePolicy.inputs, isAgentlessSelected, packageInfo]);

  useEffect(() => {
    if (prevSetupTechnology !== selectedSetupTechnology) {
      updatePackagePolicy({
        inputs: newInputs,
      });
    }
  }, [newInputs, prevSetupTechnology, selectedSetupTechnology, updatePackagePolicy, packagePolicy]);

  updateAgentlessCloudConnectorConfig(
    packagePolicy,
    newAgentPolicy,
    setNewAgentPolicy,
    setPackagePolicy
  );

  const onSaveNavigate = useOnSaveNavigate({
    queryParamsPolicyId,
  });

  const navigateAddAgent = (policy: PackagePolicy) =>
    onSaveNavigate(policy, ['openEnrollmentFlyout']);

  const navigateAddAgentHelp = (policy: PackagePolicy) =>
    onSaveNavigate(policy, ['showAddAgentHelp']);

  const onSubmit = useCallback(
    async ({
      force,
      overrideCreatedAgentPolicy,
      skipConfirmModal,
    }: {
      overrideCreatedAgentPolicy?: AgentPolicy;
      force?: boolean;
      skipConfirmModal?: boolean;
    } = {}) => {
      if (formState === 'VALID' && hasErrors) {
        setFormState('INVALID');
        return;
      }
      if (
        (agentCount !== 0 ||
          (agentPolicies.length === 0 && selectedPolicyTab !== SelectedPolicyTab.NEW)) &&
        !(
          isAgentlessIntegration(packageInfo) || isAgentlessAgentPolicy(overrideCreatedAgentPolicy)
        ) &&
        formState !== 'CONFIRM'
      ) {
        setFormState('CONFIRM');
        return;
      }

      let createdPolicy = overrideCreatedAgentPolicy;
      if (!overrideCreatedAgentPolicy) {
        try {
          setFormState('LOADING');
          const newPolicy = await createAgentPolicyIfNeeded({
            newAgentPolicy,
            packagePolicy,
            withSysMonitoring,
            packageInfo,
            selectedPolicyTab,
          });
          if (newPolicy) {
            createdPolicy = newPolicy;
            setAgentPolicies([createdPolicy]);
            updatePackagePolicy({ policy_ids: [createdPolicy.id] });
          }
        } catch (e) {
          setFormState('VALID');
          const agentlessPolicy = agentPolicies.find(
            (policy) => policy?.supports_agentless === true
          );

          if (e?.attributes?.type === AgentlessAgentCreateOverProvisionedError.name) {
            notifications.toasts.addError(e, {
              title: i18n.translate('xpack.fleet.createAgentlessPolicy.errorNotificationTitle', {
                defaultMessage: 'Unable to create integration',
              }),
              // @ts-expect-error
              toastMessage: (
                <>
                  <FormattedMessage
                    id="xpack.fleet.createAgentlessPolicy.overProvisionErrorMessage"
                    defaultMessage="You've reached the maximum number of {limit} agentless deployments. To add more, either remove or change some to Elastic Agent-based integrations. {docLink}"
                    values={{
                      limit: <b>{e?.attributes?.limit ?? DEFAULT_AGENTLESS_LIMIT}</b>,
                      docLink: (
                        <EuiLink href={docLinks.links.fleet.agentlessIntegrations} target="_blank">
                          <FormattedMessage
                            id="xpack.fleet.createAgentlessPolicy.seeDocLink"
                            defaultMessage="See agentless documentation."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </>
              ),
            });
          }
          if (e?.attributes?.type === AgentlessAgentCreateFleetUnreachableError.name) {
            notifications.toasts.addError(e, {
              title: i18n.translate('xpack.fleet.createAgentlessPolicy.errorNotificationTitle', {
                defaultMessage: 'Unable to create integration',
              }),
              // @ts-expect-error
              toastMessage: (
                <>
                  <FormattedMessage
                    id="xpack.fleet.createAgentlessPolicy.FleetUnreachableErrorMessage"
                    defaultMessage="Fleet is not reachable and required to create agentless policy. Error: {errorMessage}. {docLink}"
                    values={{
                      errorMessage: e?.message ?? '',
                      docLink: (
                        <EuiLink href={docLinks.links.fleet.agentlessIntegrations} target="_blank">
                          <FormattedMessage
                            id="xpack.fleet.createAgentlessPolicy.seeDocLink"
                            defaultMessage="See agentless documentation."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </>
              ),
            });
          } else {
            notifications.toasts.addError(e, {
              title: agentlessPolicy?.supports_agentless
                ? i18n.translate('xpack.fleet.createAgentlessPolicy.errorNotificationTitle', {
                    defaultMessage: 'Unable to create integration',
                  })
                : i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                    defaultMessage: 'Unable to create agent policy',
                  }),
            });
          }
          return;
        }
      }

      const agentPolicyIdToSave = createdPolicy?.id
        ? [createdPolicy?.id]
        : packagePolicy.policy_ids;

      const shouldForceInstallOnAgentless =
        isAgentlessAgentPolicy(createdPolicy) || isAgentlessIntegration(packageInfo);

      const forceInstall = force || shouldForceInstallOnAgentless;

      setFormState('LOADING');
      try {
        // passing pkgPolicy with policy_id here as setPackagePolicy doesn't propagate immediately
        const data = await savePackagePolicy({
          ...packagePolicy,
          policy_ids: agentPolicyIdToSave,
          force: forceInstall,
        });

        if (data?.item.package) {
          await ensurePackageKibanaAssetsInstalled({
            currentSpaceId: spaceId ?? DEFAULT_SPACE_ID,
            pkgName: data.item.package.name,
            pkgVersion: data.item.package.version,
            toasts: notifications.toasts,
          });
        }
        const hasAzureArmTemplate = data?.item
          ? getAzureArmPropsFromPackagePolicy(data.item).templateUrl
          : false;

        const hasCloudFormation = data?.item
          ? getCloudFormationPropsFromPackagePolicy(data.item).templateUrl
          : false;

        const hasGoogleCloudShell = data?.item
          ? getCloudShellUrlFromPackagePolicy(data.item)
          : false;

        // Check if agentless is configured in ESS and Serverless until Agentless API migrates to Serverless
        const isAgentlessConfigured = createdPolicy
          ? isAgentlessAgentPolicy(createdPolicy)
          : data?.item?.supports_agentless;

        // Removing this code will disabled the Save and Continue button. We need code below update form state and trigger correct modal depending on agent count
        if (hasFleetAddAgentsPrivileges && !isAgentlessConfigured && !skipConfirmModal) {
          if (agentCount) {
            setFormState('SUBMITTED');
          } else if (hasAzureArmTemplate) {
            setFormState('SUBMITTED_AZURE_ARM_TEMPLATE');
          } else if (hasCloudFormation) {
            setFormState('SUBMITTED_CLOUD_FORMATION');
          } else if (hasGoogleCloudShell) {
            setFormState('SUBMITTED_GOOGLE_CLOUD_SHELL');
          } else {
            setFormState('SUBMITTED_NO_AGENTS');
          }
        }
        setSavedPackagePolicy(data!.item);

        const promptForAgentEnrollment =
          (createdPolicy || (agentPolicies.length > 0 && !agentCount)) &&
          !isAgentlessConfigured &&
          hasFleetAddAgentsPrivileges;

        if (!skipConfirmModal) {
          if (promptForAgentEnrollment && hasAzureArmTemplate) {
            setFormState('SUBMITTED_AZURE_ARM_TEMPLATE');
            return;
          }
          if (promptForAgentEnrollment && hasCloudFormation) {
            setFormState('SUBMITTED_CLOUD_FORMATION');
            return;
          }
          if (promptForAgentEnrollment && hasGoogleCloudShell) {
            setFormState('SUBMITTED_GOOGLE_CLOUD_SHELL');
            return;
          }
          if (promptForAgentEnrollment) {
            setFormState('SUBMITTED_NO_AGENTS');
            return;
          }

          if (isAgentlessConfigured) {
            onSaveNavigate(data!.item, ['openEnrollmentFlyout']);
          } else {
            onSaveNavigate(data!.item);
          }
        }

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationTitle', {
            defaultMessage: `''{packagePolicyName}'' integration added.`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          text: promptForAgentEnrollment
            ? i18n.translate('xpack.fleet.createPackagePolicy.addedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the ''{agentPolicyNames}'' policies.`,
                values: {
                  agentPolicyNames: agentPolicies.map((policy) => policy.name).join(', '),
                },
              })
            : undefined,
          'data-test-subj': 'packagePolicyCreateSuccessToast',
        });
      } catch (error) {
        if (isVerificationError(error)) {
          setFormState('VALID'); // don't show the add agent modal
          const forceInstallUnverifiedIntegration = await confirmForceInstall(
            packagePolicy.package!
          );

          if (forceInstallUnverifiedIntegration) {
            // skip creating the agent policy because it will have already been successfully created
            onSubmit({ overrideCreatedAgentPolicy: createdPolicy, force: true });
          }
          return;
        }
        notifications.toasts.addError(error, {
          title: 'Error',
        });
        setFormState('VALID');
      }
    },
    [
      formState,
      spaceId,
      hasErrors,
      agentCount,
      isAgentlessIntegration,
      packageInfo,
      selectedPolicyTab,
      packagePolicy,
      isAgentlessAgentPolicy,
      hasFleetAddAgentsPrivileges,
      withSysMonitoring,
      newAgentPolicy,
      updatePackagePolicy,
      notifications.toasts,
      agentPolicies,
      onSaveNavigate,
      confirmForceInstall,
      docLinks.links.fleet.agentlessIntegrations,
    ]
  );

  return {
    agentPolicies,
    updateAgentPolicies,
    packagePolicy,
    updatePackagePolicy,
    savedPackagePolicy,
    onSubmit,
    formState,
    setFormState,
    hasErrors,
    validationResults,
    setValidationResults,
    hasAgentPolicyError,
    setHasAgentPolicyError,
    isInitialized,
    // TODO check
    navigateAddAgent,
    navigateAddAgentHelp,
    handleSetupTechnologyChange,
    allowedSetupTechnologies,
    selectedSetupTechnology,
    defaultSetupTechnology,
    isAgentlessSelected,
  };
}
