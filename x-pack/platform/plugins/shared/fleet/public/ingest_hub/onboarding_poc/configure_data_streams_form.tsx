/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import {
  buildInputKey,
  doesPackageHaveIntegrations,
  getInputEffectiveName,
  getNormalizedInputs,
  getPolicyTemplateDataStreamPaths,
  getRegistryStreamWithDataStreamForInputType,
  isInputOnlyPolicyTemplate,
} from '../../../common/services';
import { generateNewAgentPolicyWithDefaults } from '../../../common/services/generate_new_agent_policy';
import type {
  NewAgentPolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackagePolicy,
} from '../../../common/types';
import { useGetPackageInfoByKeyQuery } from '../../hooks';
import { useSpaceSettingsContext } from '../../hooks/use_space_settings_context';
import { SelectedPolicyTab } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/components';
import { PackagePolicyInputVarField } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_var_field';
import { useOnSubmit } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks';

export interface ConfigureDataStreamsFormProps {
  packageName: string;
  onCreated: (packagePolicy: PackagePolicy) => void;
  onCancel: () => void;
}

/**
 * PoC for ingest-dev#10467: a "Configure data streams" step built from the package manifest alone.
 *
 * What it reuses from Fleet, unchanged: `useOnSubmit` (form state, validation, creating the agent
 * policy and the package policy), `PackagePolicyInputVarField` (the var fields) and the common
 * helpers that resolve a policy template's inputs and streams. What it renders itself: the list of
 * data streams with a toggle and their user-facing vars, so it is the new form and not the
 * existing add-integration page.
 */
export const ConfigureDataStreamsForm: React.FC<ConfigureDataStreamsFormProps> = ({
  packageName,
  onCreated,
  onCancel,
}) => {
  const spaceSettings = useSpaceSettingsContext();
  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>(() =>
    generateNewAgentPolicyWithDefaults({
      name: `${packageName} PoC ${new Date().toISOString().slice(0, 19)}`,
      namespace: spaceSettings.defaultNamespace,
    })
  );
  const [selectedPolicyTab, setSelectedPolicyTab] = useState<SelectedPolicyTab>(
    SelectedPolicyTab.NEW
  );
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading,
  } = useGetPackageInfoByKeyQuery(packageName, undefined, { full: true }, { enabled: true });
  // `useOnSubmit` initialises the policy from the package info in an effect: keep the reference stable.
  const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);

  const {
    packagePolicy,
    updatePackagePolicy,
    validationResults,
    onSubmit,
    savedPackagePolicy,
    submitAttempted,
  } = useOnSubmit({
    agentCount: 0,
    packageInfo,
    newAgentPolicy,
    selectedPolicyTab,
    withSysMonitoring: false,
    queryParamsPolicyId: undefined,
    hasFleetAddAgentsPrivileges: false,
    setNewAgentPolicy,
    setSelectedPolicyTab,
    isAddIntegrationFlyout: true,
  });

  useEffect(() => {
    // `useOnSubmit` returns the API result tagged by type: `{ type: 'packagePolicy', policy }`.
    if (savedPackagePolicy?.type === 'packagePolicy') {
      onCreated(savedPackagePolicy.policy);
    }
  }, [savedPackagePolicy, onCreated]);

  const updateStream = useCallback(
    (inputIndex: number, streamIndex: number, patch: Partial<NewPackagePolicyInputStream>) => {
      const inputs = packagePolicy.inputs.map((input, i) =>
        i !== inputIndex
          ? input
          : {
              ...input,
              streams: input.streams.map((stream, j) =>
                j === streamIndex ? { ...stream, ...patch } : stream
              ),
            }
      );
      updatePackagePolicy({ inputs });
    },
    [packagePolicy, updatePackagePolicy]
  );

  const handleCreate = useCallback(async () => {
    setIsSaving(true);
    try {
      // `skipConfirmModal` is what keeps `useOnSubmit` from navigating the whole app away
      // (`application.navigateToApp`), which a memory router would not catch.
      await onSubmit({ skipConfirmModal: true });
    } finally {
      setIsSaving(false);
    }
  }, [onSubmit]);

  if (isLoading || !packageInfo) {
    return packageInfoError ? (
      <KbnDangerCallout announceOnMount title={`Could not load package ${packageName}`} />
    ) : (
      <EuiLoadingSpinner size="l" />
    );
  }

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);

  const dataStreamPanels: React.ReactNode[] = [];
  (packageInfo.policy_templates ?? []).forEach((policyTemplate) => {
    getNormalizedInputs(policyTemplate).forEach((packageInput) => {
      const effectiveName = getInputEffectiveName(packageInput);
      const inputIndex = packagePolicy.inputs.findIndex(
        (input: NewPackagePolicyInput) =>
          getInputEffectiveName(input) === effectiveName &&
          (hasIntegrations ? input.policy_template === policyTemplate.name : true)
      );
      if (inputIndex < 0) return;

      const dataStreamPaths =
        isInputOnlyPolicyTemplate(policyTemplate) || hasIntegrations
          ? getPolicyTemplateDataStreamPaths(packageInfo, policyTemplate)
          : [];
      const registryStreams = getRegistryStreamWithDataStreamForInputType(
        effectiveName,
        packageInfo,
        dataStreamPaths
      );
      const inputValidation =
        validationResults?.inputs?.[
          buildInputKey(effectiveName, policyTemplate.name, hasIntegrations)
        ];

      packagePolicy.inputs[inputIndex].streams.forEach((stream, streamIndex) => {
        const registryStream = registryStreams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );
        if (!registryStream) return;
        const streamValidation =
          inputValidation?.streams?.[stream.data_stream.dataset] ??
          (stream.id ? inputValidation?.streams?.[stream.id] : undefined);
        const userVars = (registryStream.vars ?? []).filter((v) => v.show_user);

        dataStreamPanels.push(
          <EuiPanel
            key={`${policyTemplate.name}-${effectiveName}-${stream.data_stream.dataset}`}
            hasBorder
          >
            <EuiSwitch
              label={registryStream.data_stream.title ?? stream.data_stream.dataset}
              checked={stream.enabled}
              onChange={(e) => updateStream(inputIndex, streamIndex, { enabled: e.target.checked })}
              data-test-subj={`onboardingPocStreamToggle-${stream.data_stream.dataset}`}
            />
            <EuiText size="xs" color="subdued">
              {registryStream.title}
            </EuiText>
            {stream.enabled && userVars.length > 0 && (
              <>
                <EuiSpacer size="m" />
                {userVars.map((varDef) => (
                  <EuiFlexItem key={varDef.name} css={{ marginBlockEnd: 8 }}>
                    <PackagePolicyInputVarField
                      varDef={varDef}
                      value={stream.vars?.[varDef.name]?.value}
                      frozen={stream.vars?.[varDef.name]?.frozen ?? false}
                      onChange={(newValue: unknown) =>
                        updateStream(inputIndex, streamIndex, {
                          vars: {
                            ...stream.vars,
                            [varDef.name]: { type: varDef.type, value: newValue },
                          },
                        })
                      }
                      errors={streamValidation?.vars?.[varDef.name]}
                      forceShowErrors={submitAttempted}
                      packageType={packageInfo.type}
                      packageName={packageInfo.name}
                    />
                  </EuiFlexItem>
                ))}
              </>
            )}
          </EuiPanel>,
          <EuiSpacer
            key={`sp-${policyTemplate.name}-${effectiveName}-${stream.data_stream.dataset}`}
            size="m"
          />
        );
      });
    });
  });

  return (
    <div data-test-subj="onboardingPocConfigureDataStreams">
      <EuiTitle size="s">
        <h3>Configure data streams: {packageInfo.title}</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        Built from the package manifest. Creates a new agent policy and a real package policy.
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow label="Integration policy name" fullWidth>
            <EuiFieldText
              fullWidth
              value={packagePolicy.name ?? ''}
              onChange={(e) => updatePackagePolicy({ name: e.target.value })}
              data-test-subj="onboardingPocPolicyName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Namespace" fullWidth>
            <EuiFieldText
              fullWidth
              placeholder={spaceSettings.defaultNamespace}
              value={packagePolicy.namespace ?? ''}
              onChange={(e) => updatePackagePolicy({ namespace: e.target.value })}
              data-test-subj="onboardingPocNamespace"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {dataStreamPanels}

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="onboardingPocCancel">
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isSaving}
            onClick={handleCreate}
            data-test-subj="onboardingPocCreate"
          >
            Create integration policy
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
