/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  getNormalizedInputs,
  isIntegrationPolicyTemplate,
  getRegistryStreamWithDataStreamForInputType,
} from '../../../../../../../../common/services';
import { isInputAllowedForDeploymentMode } from '../../../../../../../../common/services/agentless_policy_helper';

import type {
  PackageInfo,
  NewPackagePolicy,
  NewPackagePolicyInput,
  RegistryInput,
} from '../../../../../types';
import { Loading } from '../../../../../components';
import { doesPackageHaveIntegrations, ExperimentalFeaturesService } from '../../../../../services';

import type { PackagePolicyValidationResults, VarGroupSelection } from '../../services';
import { isInputCompatibleWithVarGroupSelections } from '../../services';

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
  isAgentlessSelected?: boolean;
  varGroupSelections?: VarGroupSelection;
}> = ({
  packageInfo,
  showOnlyIntegration,
  packagePolicy,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
  noTopRule = false,
  isEditPage = false,
  isAgentlessSelected = false,
  varGroupSelections = {},
}) => {
  const hasIntegrations = useMemo(() => doesPackageHaveIntegrations(packageInfo), [packageInfo]);
  const deploymentMode =
    (isEditPage || isAgentlessSelected) && packagePolicy.supports_agentless
      ? 'agentless'
      : 'default';
  const packagePolicyTemplates = useMemo(
    () =>
      showOnlyIntegration
        ? (packageInfo.policy_templates || []).filter(
            (policyTemplate) => policyTemplate.name === showOnlyIntegration
          )
        : packageInfo.policy_templates || [],
    [packageInfo.policy_templates, showOnlyIntegration]
  );

  const isSinglePolicyTemplate = packagePolicyTemplates.length === 1;

  // Configure inputs (and their streams)
  const renderConfigureInputs = () =>
    packagePolicyTemplates.length ? (
      <>
        {!noTopRule && <EuiHorizontalRule margin="m" />}
        <EuiFlexGroup direction="column" gutterSize="none">
          {packagePolicyTemplates.map((policyTemplate) => {
            const inputs = getNormalizedInputs(policyTemplate);
            const packagePolicyInputs = packagePolicy.inputs;
            const isPolicyTemplateDeprecated = !hasIntegrations && !!policyTemplate.deprecated;

            const inputsToRender = inputs
              .map((packageInput) => {
                const packagePolicyInput = packagePolicyInputs.find(
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

                if (
                  !packagePolicyInput ||
                  !isInputAllowedForDeploymentMode(
                    packagePolicyInput,
                    deploymentMode,
                    packageInfo
                  ) ||
                  !isInputCompatibleWithVarGroupSelections(packageInput, varGroupSelections)
                ) {
                  return null;
                }

                return { packageInput, packagePolicyInput, packageInputStreams };
              })
              .filter(
                (
                  item
                ): item is {
                  packageInput: RegistryInput;
                  packagePolicyInput: NewPackagePolicyInput;
                  packageInputStreams: ReturnType<
                    typeof getRegistryStreamWithDataStreamForInputType
                  >;
                } => item !== null
              );

            const isSingleInput = isSinglePolicyTemplate && inputsToRender.length === 1;
            //  Enable simplified agentless UX for single input/datastreams integrations
            const isSingleInputAndStreams =
              ExperimentalFeaturesService.get().enableSimplifiedAgentlessUX &&
              isSingleInput &&
              inputsToRender[0].packagePolicyInput.streams.length <= 1;

            return (
              <React.Fragment key={policyTemplate.name}>
                {isPolicyTemplateDeprecated && (
                  <>
                    <EuiCallOut
                      announceOnMount
                      data-test-subj="deprecatedPolicyTemplateCallout"
                      title={i18n.translate(
                        'xpack.fleet.createPackagePolicy.stepConfigure.deprecatedPolicyTemplateTitle',
                        {
                          defaultMessage: 'The policy template "{title}" is deprecated',
                          values: { title: policyTemplate.title },
                        }
                      )}
                      color="warning"
                      iconType="warning"
                      size="s"
                    >
                      <p>{policyTemplate.deprecated?.description}</p>
                    </EuiCallOut>
                    <EuiSpacer size="m" />
                  </>
                )}
                {inputsToRender.map(({ packageInput, packagePolicyInput, packageInputStreams }) => {
                  const updatePackagePolicyInput = (
                    updatedInput: Partial<NewPackagePolicyInput>
                  ) => {
                    const indexOfUpdatedInput = packagePolicyInputs.findIndex(
                      (input) =>
                        input.type === packageInput.type &&
                        (hasIntegrations ? input.policy_template === policyTemplate.name : true)
                    );
                    const newInputs = [...packagePolicyInputs];
                    newInputs[indexOfUpdatedInput] = {
                      ...newInputs[indexOfUpdatedInput],
                      ...updatedInput,
                    };
                    updatePackagePolicy({
                      inputs: newInputs,
                    });
                  };

                  return (
                    <EuiFlexItem key={packageInput.type}>
                      <PackagePolicyInputPanel
                        isSingleInputAndStreams={isSingleInputAndStreams}
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
                        varGroupSelections={varGroupSelections}
                      />
                      <EuiHorizontalRule margin="m" />
                    </EuiFlexItem>
                  );
                })}
              </React.Fragment>
            );
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
