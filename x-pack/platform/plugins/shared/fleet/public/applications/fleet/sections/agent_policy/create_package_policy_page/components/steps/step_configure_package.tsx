/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  getNormalizedInputs,
  isIntegrationPolicyTemplate,
  getRegistryStreamWithDataStreamForInputType,
} from '../../../../../../../../common/services';

import { SetupTechnology } from '../../../../../types';
import type { PackageInfo, NewPackagePolicy, NewPackagePolicyInput } from '../../../../../types';
import { Loading } from '../../../../../components';
import { doesPackageHaveIntegrations } from '../../../../../services';

import type { PackagePolicyValidationResults } from '../../services';

import { useAgentless } from '../../single_page_layout/hooks/setup_technology';
import { AGENTLESS_DISABLED_INPUTS } from '../../../../../../../../common/constants';

import { PackagePolicyInputPanel } from './components';

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  packageInfo: PackageInfo;
  showOnlyIntegration?: string;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults | undefined;
  submitAttempted: boolean;
  noTopRule?: boolean;
  isEditPage?: boolean;
  setupTechnology?: SetupTechnology;
}> = ({
  packageInfo,
  showOnlyIntegration,
  packagePolicy,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
  noTopRule = false,
  isEditPage = false,
  setupTechnology,
}) => {
  const setupTechnologyRef = useRef<SetupTechnology | undefined>(setupTechnology);
  const { isAgentlessIntegration } = useAgentless();

  // sync the inputs with the agentless selector change
  useEffect(() => {
    setupTechnologyRef.current = setupTechnology;
  });
  const prevSetupTechnology = setupTechnologyRef.current;
  const isAgentlessSelected =
    isAgentlessIntegration(packageInfo) && setupTechnology === SetupTechnology.AGENTLESS;

  const newInputs = useMemo(() => {
    return packagePolicy.inputs.map((input) => {
      if (isAgentlessSelected && AGENTLESS_DISABLED_INPUTS.includes(input.type)) {
        return { ...input, enabled: false, keep_enabled: false };
      }
      return input;
    });
  }, [isAgentlessSelected, packagePolicy.inputs]);

  useEffect(() => {
    if (prevSetupTechnology !== setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
      updatePackagePolicy({
        inputs: newInputs,
      });
    }
  }, [newInputs, prevSetupTechnology, setupTechnology, updatePackagePolicy, packagePolicy]);

  const hasIntegrations = useMemo(() => doesPackageHaveIntegrations(packageInfo), [packageInfo]);
  const packagePolicyTemplates = useMemo(
    () =>
      showOnlyIntegration
        ? (packageInfo.policy_templates || []).filter(
            (policyTemplate) => policyTemplate.name === showOnlyIntegration
          )
        : packageInfo.policy_templates || [],
    [packageInfo.policy_templates, showOnlyIntegration]
  );
  // Configure inputs (and their streams)
  const renderConfigureInputs = () =>
    packagePolicyTemplates.length ? (
      <>
        {!noTopRule && <EuiHorizontalRule margin="m" />}
        <EuiFlexGroup direction="column" gutterSize="none">
          {packagePolicyTemplates.map((policyTemplate) => {
            const inputs = getNormalizedInputs(policyTemplate);
            return inputs.map((packageInput) => {
              const packagePolicyInput = newInputs.find(
                (input) =>
                  input.type === packageInput.type &&
                  (hasIntegrations ? input.policy_template === policyTemplate.name : true)
              );
              const packageInputStreams = getRegistryStreamWithDataStreamForInputType(
                packageInput.type,
                packageInfo,
                hasIntegrations && isIntegrationPolicyTemplate(policyTemplate)
                  ? policyTemplate.data_streams
                  : []
              );

              const updatePackagePolicyInput = (updatedInput: Partial<NewPackagePolicyInput>) => {
                const indexOfUpdatedInput = newInputs.findIndex(
                  (input) =>
                    input.type === packageInput.type &&
                    (hasIntegrations ? input.policy_template === policyTemplate.name : true)
                );
                const updatedInputs = [...newInputs];
                updatedInputs[indexOfUpdatedInput] = {
                  ...updatedInputs[indexOfUpdatedInput],
                  ...updatedInput,
                };
                updatePackagePolicy({
                  inputs: newInputs,
                });
              };

              return packagePolicyInput ? (
                <EuiFlexItem key={packageInput.type}>
                  <PackagePolicyInputPanel
                    setupTechnology={setupTechnology}
                    packageInput={packageInput}
                    packageInfo={packageInfo}
                    packageInputStreams={packageInputStreams}
                    packagePolicyInput={packagePolicyInput}
                    updatePackagePolicyInput={updatePackagePolicyInput}
                    inputValidationResults={
                      validationResults?.inputs?.[
                        hasIntegrations
                          ? `${policyTemplate.name}-${packagePolicyInput.type}`
                          : packagePolicyInput.type
                      ] ?? {}
                    }
                    forceShowErrors={submitAttempted}
                    isEditPage={isEditPage}
                  />
                  <EuiHorizontalRule margin="m" />
                </EuiFlexItem>
              ) : null;
            });
          })}
        </EuiFlexGroup>
      </>
    ) : (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="success"
        body={
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.noPolicyOptionsMessage"
                defaultMessage="Nothing to configure"
              />
            </p>
          </EuiText>
        }
      />
    );

  return validationResults ? renderConfigureInputs() : <Loading />;
};
