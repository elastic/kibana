/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import { EuiIcon, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy, Output, PackageInfo } from '../../../../../../../../../common';
import {
  FLEET_APM_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../../../../../../common';
import { outputType } from '../../../../../../../../../common/constants';
import { isPackageLimited } from '../../../../../../../../../common/services';
import { useGetAgentPolicies, useGetOutputs, useGetPackagePolicies } from '../../../../../../hooks';

export function useAgentPoliciesOptions(packageInfo?: PackageInfo) {
  // Fetch agent policies info
  const {
    data: agentPoliciesData,
    error: agentPoliciesError,
    isLoading: isAgentPoliciesLoading,
  } = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    sortField: 'name',
    sortOrder: 'asc',
    noAgentCount: true, // agentPolicy.agents will always be 0
    full: false, // package_policies will always be empty
  });
  const agentPolicies = useMemo(
    () => agentPoliciesData?.items.filter((policy) => !policy.is_managed) || [],
    [agentPoliciesData?.items]
  );

  const { data: outputsData, isLoading: isOutputLoading } = useGetOutputs();

  // get all package policies with apm integration or the current integration
  const { data: packagePoliciesForThisPackage, isLoading: isLoadingPackagePolicies } =
    useGetPackagePolicies({
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${packageInfo?.name}`,
    });

  const packagePoliciesForThisPackageByAgentPolicyId = useMemo(
    () =>
      packagePoliciesForThisPackage?.items.reduce(
        (acc: { [key: string]: boolean }, packagePolicy) => {
          packagePolicy.policy_ids.forEach((policyId) => {
            acc[policyId] = true;
          });
          return acc;
        },
        {}
      ),
    [packagePoliciesForThisPackage?.items]
  );

  const { getDataOutputForPolicy } = useMemo(() => {
    const defaultOutput = (outputsData?.items ?? []).find((output) => output.is_default);
    const outputsById = (outputsData?.items ?? []).reduce(
      (acc: { [key: string]: Output }, output) => {
        acc[output.id] = output;
        return acc;
      },
      {}
    );

    return {
      getDataOutputForPolicy: (policy: Pick<AgentPolicy, 'data_output_id'>) => {
        return policy.data_output_id ? outputsById[policy.data_output_id] : defaultOutput;
      },
    };
  }, [outputsData]);

  const agentPolicyOptions: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      packageInfo
        ? agentPolicies.map((policy) => {
            const isLimitedPackageAlreadyInPolicy =
              isPackageLimited(packageInfo!) &&
              packagePoliciesForThisPackageByAgentPolicyId?.[policy.id];

            const isAPMPackageAndDataOutputIsLogstash =
              packageInfo?.name === FLEET_APM_PACKAGE &&
              getDataOutputForPolicy(policy)?.type === outputType.Logstash;

            return {
              inputDisplay: (
                <>
                  <EuiText size="s">{policy.name}</EuiText>
                  {isAPMPackageAndDataOutputIsLogstash && (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyDisabledAPMLogstashOuputText"
                          defaultMessage="Logstash output for integrations is not supported with APM"
                        />
                      </EuiText>
                    </>
                  )}
                </>
              ),
              value: policy.id,
              disabled: isLimitedPackageAlreadyInPolicy || isAPMPackageAndDataOutputIsLogstash,
              'data-test-subj': 'agentPolicyItem',
            };
          })
        : [],
    [
      packageInfo,
      agentPolicies,
      packagePoliciesForThisPackageByAgentPolicyId,
      getDataOutputForPolicy,
    ]
  );

  const agentPolicyMultiOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      packageInfo && !isOutputLoading && !isAgentPoliciesLoading && !isLoadingPackagePolicies
        ? agentPolicies
            .filter((policy) => policy.supports_agentless !== true)
            .map((policy) => {
              const isLimitedPackageAlreadyInPolicy =
                isPackageLimited(packageInfo!) &&
                packagePoliciesForThisPackageByAgentPolicyId?.[policy.id];

              const isAPMPackageAndDataOutputIsLogstash =
                packageInfo?.name === FLEET_APM_PACKAGE &&
                getDataOutputForPolicy(policy)?.type === outputType.Logstash;

              return {
                append: isAPMPackageAndDataOutputIsLogstash ? (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyDisabledAPMLogstashOuputText"
                        defaultMessage="Logstash output for integrations is not supported with APM"
                      />
                    }
                  >
                    <EuiIcon size="s" type="warningFilled" />
                  </EuiToolTip>
                ) : null,
                key: policy.id,
                label: policy.name,
                disabled: isLimitedPackageAlreadyInPolicy || isAPMPackageAndDataOutputIsLogstash,
                'data-test-subj': 'agentPolicyMultiItem',
              };
            })
        : [],
    [
      packageInfo,
      agentPolicies,
      packagePoliciesForThisPackageByAgentPolicyId,
      getDataOutputForPolicy,
      isOutputLoading,
      isAgentPoliciesLoading,
      isLoadingPackagePolicies,
    ]
  );

  return {
    agentPoliciesError,
    isLoading: isOutputLoading || isAgentPoliciesLoading || isLoadingPackagePolicies,
    agentPolicyOptions,
    agentPolicies,
    agentPolicyMultiOptions,
  };
}
