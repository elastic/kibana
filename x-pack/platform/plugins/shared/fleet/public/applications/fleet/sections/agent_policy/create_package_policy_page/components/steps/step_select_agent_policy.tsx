/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSuperSelect } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { Error } from '../../../../../components';

import type { AgentPolicy, PackageInfo } from '../../../../../types';
import { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from '../../../../../services';
import { useFleetStatus, sendBulkGetAgentPolicies } from '../../../../../hooks';

import { useMultipleAgentPolicies } from '../../../../../hooks';

import { AgentPolicyMultiSelect } from './components/agent_policy_multi_select';
import { useAgentPoliciesOptions } from './components/agent_policy_options';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

function doesAgentPolicyHaveLimitedPackage(policy: AgentPolicy, pkgInfo: PackageInfo) {
  return policy
    ? isPackageLimited(pkgInfo) && doesAgentPolicyAlreadyIncludePackage(policy, pkgInfo.name)
    : false;
}

export const StepSelectAgentPolicy: React.FunctionComponent<{
  packageInfo?: PackageInfo;
  agentPolicies: AgentPolicy[];
  updateAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
  setHasAgentPolicyError: (hasError: boolean) => void;
  initialSelectedAgentPolicyIds: string[];
}> = ({
  packageInfo,
  agentPolicies,
  updateAgentPolicies: updateSelectedAgentPolicies,
  setHasAgentPolicyError,
  initialSelectedAgentPolicyIds,
}) => {
  const { isReady: isFleetReady } = useFleetStatus();

  const [selectedAgentPolicyError, setSelectedAgentPolicyError] = useState<Error>();

  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  const {
    isLoading,
    agentPoliciesError,
    agentPolicyOptions,
    agentPolicyMultiOptions,
    agentPolicies: existingAgentPolicies,
  } = useAgentPoliciesOptions(packageInfo);

  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  const [isLoadingSelectedAgentPolicies, setIsLoadingSelectedAgentPolicies] =
    useState<boolean>(false);
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<AgentPolicy[]>(agentPolicies);

  const updateAgentPolicies = useCallback(
    (selectedPolicies: AgentPolicy[]) => {
      setSelectedAgentPolicies(selectedPolicies);
      updateSelectedAgentPolicies(selectedPolicies);
    },
    [updateSelectedAgentPolicies]
  );
  // Update parent selected agent policy state
  useEffect(() => {
    const fetchAgentPolicyInfo = async () => {
      if (selectedPolicyIds.length > 0) {
        setIsLoadingSelectedAgentPolicies(true);
        const { data, error } = await sendBulkGetAgentPolicies(selectedPolicyIds, { full: true });
        if (error) {
          setSelectedAgentPolicyError(error);
          updateAgentPolicies([]);
        } else if (data && data.items) {
          setSelectedAgentPolicyError(undefined);
          updateAgentPolicies(data.items);
        }
        setIsLoadingSelectedAgentPolicies(false);
      } else {
        setSelectedAgentPolicyError(undefined);
        updateAgentPolicies([]);
      }
    };
    if (isLoading || isFirstLoad) {
      return;
    }
    const agentPolicyIds = agentPolicies.map((policy) => policy.id);
    const agentPoliciesHaveAllSelectedIds = selectedPolicyIds.every((id) =>
      agentPolicyIds.includes(id)
    );
    if (
      (agentPolicies.length === 0 && selectedPolicyIds.length !== 0) ||
      !agentPoliciesHaveAllSelectedIds
    ) {
      fetchAgentPolicyInfo();
    } else if (agentPoliciesHaveAllSelectedIds && selectedPolicyIds.length < agentPolicies.length) {
      setSelectedAgentPolicyError(undefined);
      updateAgentPolicies(agentPolicies.filter((policy) => selectedPolicyIds.includes(policy.id)));
    }
  }, [selectedPolicyIds, agentPolicies, updateAgentPolicies, isLoading, isFirstLoad]);

  // Try to select default agent policy
  useEffect(() => {
    if (
      isFirstLoad &&
      selectedPolicyIds.length === 0 &&
      existingAgentPolicies.length &&
      (canUseMultipleAgentPolicies ? agentPolicyMultiOptions.length : agentPolicyOptions.length)
    ) {
      setIsFirstLoad(false);
      if (canUseMultipleAgentPolicies) {
        const enabledOptions = agentPolicyMultiOptions.filter((option) => !option.disabled);
        if (enabledOptions.length === 1 && initialSelectedAgentPolicyIds.length === 0) {
          setSelectedPolicyIds([enabledOptions[0].key!]);
        } else if (initialSelectedAgentPolicyIds.length > 0) {
          setSelectedPolicyIds(initialSelectedAgentPolicyIds);
        }
      } else {
        const enabledOptions = agentPolicyOptions.filter((option) => !option.disabled);
        if (enabledOptions.length === 1) {
          setSelectedPolicyIds([enabledOptions[0].value]);
        } else if (initialSelectedAgentPolicyIds.length > 0) {
          setSelectedPolicyIds(initialSelectedAgentPolicyIds);
        }
      }
    }
  }, [
    agentPolicyOptions,
    agentPolicyMultiOptions,
    canUseMultipleAgentPolicies,
    initialSelectedAgentPolicyIds,
    selectedPolicyIds,
    existingAgentPolicies,
    isFirstLoad,
  ]);

  // Bubble up any issues with agent policy selection
  useEffect(() => {
    if (!selectedAgentPolicyError) {
      setHasAgentPolicyError(false);
    } else {
      setHasAgentPolicyError(true);
    }
  }, [selectedAgentPolicyError, selectedPolicyIds, setHasAgentPolicyError]);

  const onChange = useCallback(
    (newValue: string) => setSelectedPolicyIds(newValue === '' ? [] : [newValue]),
    []
  );

  // Display agent policies list error if there is one
  if (agentPoliciesError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingAgentPoliciesTitle"
            defaultMessage="Error loading agent policies"
          />
        }
        error={agentPoliciesError}
      />
    );
  }

  const someNewAgentPoliciesHaveLimitedPackage =
    !packageInfo ||
    selectedAgentPolicies
      .filter((policy) => !initialSelectedAgentPolicyIds.find((id) => policy.id === id))
      .some((selectedAgentPolicy) =>
        doesAgentPolicyHaveLimitedPackage(selectedAgentPolicy, packageInfo)
      );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyFormGroupTitle"
                    defaultMessage="Agent policies"
                  />
                </h3>
              </EuiTitle>
            }
            description={
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyFormGroupDescription"
                    defaultMessage="Agent policies are used to manage a group of integrations across a set of agents."
                  />
                </p>
              </EuiText>
            }
          >
            <AgentPolicyFormRow
              fullWidth
              label={
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyLabel"
                      defaultMessage="Agent policies"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              helpText={
                isFleetReady && selectedPolicyIds.length > 0 && !isLoadingSelectedAgentPolicies ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsDescriptionText"
                    defaultMessage="{count, plural, one {# agent is} other {# agents are}} enrolled with the selected agent policies."
                    values={{
                      count: selectedAgentPolicies.reduce(
                        (acc, curr) => acc + (curr.agents ?? 0),
                        0
                      ),
                    }}
                  />
                ) : null
              }
              isInvalid={Boolean(someNewAgentPoliciesHaveLimitedPackage)}
              error={
                someNewAgentPoliciesHaveLimitedPackage ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.cannotAddLimitedIntegrationError"
                    defaultMessage="This integration can only be added once per agent policy."
                  />
                ) : null
              }
            >
              {canUseMultipleAgentPolicies ? (
                <AgentPolicyMultiSelect
                  isLoading={isLoading || !packageInfo || isLoadingSelectedAgentPolicies}
                  selectedPolicyIds={selectedPolicyIds}
                  setSelectedPolicyIds={setSelectedPolicyIds}
                  agentPolicyMultiOptions={agentPolicyMultiOptions}
                  selectedAgentPolicies={agentPolicies}
                />
              ) : (
                <EuiSuperSelect
                  placeholder={i18n.translate(
                    'xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyPlaceholderText',
                    {
                      defaultMessage: 'Select an agent policy to add this integration to',
                    }
                  )}
                  fullWidth
                  isLoading={isLoading || !packageInfo || isLoadingSelectedAgentPolicies}
                  options={agentPolicyOptions}
                  valueOfSelected={selectedPolicyIds[0]}
                  onChange={onChange}
                  data-test-subj="agentPolicySelect"
                  aria-label="Select Agent Policy"
                />
              )}
            </AgentPolicyFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
        {/* Display selected agent policy error if there is one */}
        {selectedAgentPolicyError ? (
          <EuiFlexItem>
            <Error
              title={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingSelectedAgentPolicyTitle"
                  defaultMessage="Error loading selected agent policy"
                />
              }
              error={selectedAgentPolicyError}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
