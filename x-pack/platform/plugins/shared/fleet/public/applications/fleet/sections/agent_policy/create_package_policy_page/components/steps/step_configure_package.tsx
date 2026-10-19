/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  getNormalizedInputs,
  isInputOnlyPolicyTemplate,
  getPolicyTemplateDataStreamPaths,
  getRegistryStreamWithDataStreamForInputType,
  getInputEffectiveName,
  buildInputKey,
  getLogsdbColumnarNotReadyDataStreams,
  getLogsdbColumnarReadiness,
  isLogsdbColumnarReady,
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

import { ColumnarIndexModeSwitch, PackagePolicyInputPanel } from './components';

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  packageInfo: PackageInfo;
  showOnlyIntegration?: string;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults | undefined;
  submitAttempted: boolean;
  noTopRule?: boolean;
  isEditPage?: boolean;
  isUpgrade?: boolean;
  isAgentlessSelected?: boolean;
  varGroupSelections?: VarGroupSelection;
  bottomExtension?: React.ReactNode;
}> = ({
  packageInfo,
  showOnlyIntegration,
  packagePolicy,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
  noTopRule = false,
  isEditPage = false,
  isUpgrade = false,
  isAgentlessSelected = false,
  varGroupSelections = {},
  bottomExtension,
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

  // Columnar index mode: one choice per installed integration, stored on the installation rather
  // than on the policy. Every integration with a logs data stream shows the toggle. It can only be
  // turned on when all its logs data streams declare readiness, and is greyed out with an
  // explanation otherwise; turning it off is always possible. Data streams that aren't ready stay
  // on LogsDB: they are listed under the toggle, and the ones marked `unsupported` are noted in
  // their own section.
  const columnarReadyDataStreams = useMemo(
    () =>
      packageInfo.type === 'input'
        ? []
        : (packageInfo.data_streams ?? []).filter((dataStream) =>
            isLogsdbColumnarReady(getLogsdbColumnarReadiness(packageInfo, dataStream))
          ),
    [packageInfo]
  );
  const columnarNotReadyDataStreams = useMemo(
    () =>
      packageInfo.type === 'input'
        ? []
        : getLogsdbColumnarNotReadyDataStreams(packageInfo, packageInfo.data_streams).map(
            (dataStream) => dataStream.title || dataStream.dataset
          ),
    [packageInfo]
  );
  const hasLogsDataStreams =
    packageInfo.type !== 'input' &&
    (packageInfo.data_streams ?? []).some((dataStream) => dataStream.type === 'logs');
  const isColumnarIndexModeReady = hasLogsDataStreams && columnarNotReadyDataStreams.length === 0;
  // The pending choice wins, then the one stored on the installation, then the mode the
  // installation uses today, and for a new installation the package default, which only applies
  // when every logs data stream is ready.
  const installationInfo =
    'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;
  const isColumnarIndexModeEnabled =
    packagePolicy.package?.logsdb_columnar ??
    installationInfo?.logsdb_columnar_enabled ??
    installationInfo?.logsdb_columnar_active ??
    (isColumnarIndexModeReady &&
      columnarReadyDataStreams.some(
        (dataStream) => getLogsdbColumnarReadiness(packageInfo, dataStream) === 'default'
      ));
  // The user opted in, but this version has no columnar-ready logs data stream left: show the
  // switch off and disabled so the user learns why the data streams go back to LogsDB.
  const isColumnarIndexModeWithdrawn =
    packageInfo.type !== 'input' &&
    columnarReadyDataStreams.length === 0 &&
    installationInfo?.logsdb_columnar_enabled === true;
  // Off while not every logs data stream is ready: it can't be turned on. When it is on (an
  // upgrade made a data stream unready), it stays usable so that it can be turned off.
  const isColumnarIndexModeNotReady =
    hasLogsDataStreams &&
    !isColumnarIndexModeReady &&
    !isColumnarIndexModeWithdrawn &&
    !isColumnarIndexModeEnabled;
  const toggleColumnarIndexMode = () =>
    updatePackagePolicy({
      package: {
        name: packageInfo.name,
        title: packageInfo.title,
        version: packageInfo.version,
        ...packagePolicy.package,
        logsdb_columnar: !isColumnarIndexModeEnabled,
      },
    });

  // Configure inputs (and their streams)
  const renderConfigureInputs = () =>
    packagePolicyTemplates.length ? (
      <>
        {!noTopRule && <EuiHorizontalRule margin="m" />}
        {(hasLogsDataStreams || isColumnarIndexModeWithdrawn) && (
          <>
            <ColumnarIndexModeSwitch
              checked={
                isColumnarIndexModeEnabled &&
                !isColumnarIndexModeWithdrawn &&
                !isColumnarIndexModeNotReady
              }
              disabled={isColumnarIndexModeWithdrawn || isColumnarIndexModeNotReady}
              notReady={isColumnarIndexModeNotReady}
              notReadyDataStreams={
                columnarReadyDataStreams.length > 0 ? columnarNotReadyDataStreams : []
              }
              withdrawn={isColumnarIndexModeWithdrawn}
              onChange={toggleColumnarIndexMode}
              unsupportedDataStreams={columnarNotReadyDataStreams}
            />
            <EuiHorizontalRule margin="m" />
          </>
        )}
        <EuiFlexGroup direction="column" gutterSize="none">
          {packagePolicyTemplates.map((policyTemplate) => {
            const inputs = getNormalizedInputs(policyTemplate);
            const packagePolicyInputs = packagePolicy.inputs;
            const isPolicyTemplateDeprecated = !hasIntegrations && !!policyTemplate.deprecated;

            const inputsToRender = inputs
              .map((packageInput) => {
                const registryEffectiveName = getInputEffectiveName(packageInput);
                const packagePolicyInput = packagePolicyInputs.find(
                  (input) =>
                    getInputEffectiveName(input) === registryEffectiveName &&
                    (hasIntegrations ? input.policy_template === policyTemplate.name : true)
                );

                // Scope stream resolution to this policy template's own data stream(s) so that
                // input packages with multiple templates sharing an input type don't duplicate
                // each template's streams (and stream vars like data_stream.dataset). Single-template
                // integration packages keep searching all data streams, preserving previous behavior.
                const dataStreamPaths =
                  isInputOnlyPolicyTemplate(policyTemplate) || hasIntegrations
                    ? getPolicyTemplateDataStreamPaths(packageInfo, policyTemplate)
                    : [];

                const packageInputStreams = getRegistryStreamWithDataStreamForInputType(
                  registryEffectiveName,
                  packageInfo,
                  dataStreamPaths
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
                    <KbnWarningCallout
                      announceOnMount
                      data-test-subj="deprecatedPolicyTemplateCallout"
                      title={i18n.translate(
                        'xpack.fleet.createPackagePolicy.stepConfigure.deprecatedPolicyTemplateTitle',
                        {
                          defaultMessage: 'The policy template "{title}" is deprecated',
                          values: { title: policyTemplate.title },
                        }
                      )}
                      size="s"
                      text={policyTemplate.deprecated?.description}
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                {inputsToRender.map(({ packageInput, packagePolicyInput, packageInputStreams }) => {
                  const policyInputEffectiveName = getInputEffectiveName(packagePolicyInput);
                  const updatePackagePolicyInput = (
                    updatedInput: Partial<NewPackagePolicyInput>
                  ) => {
                    const indexOfUpdatedInput = packagePolicyInputs.findIndex(
                      (input) =>
                        getInputEffectiveName(input) === policyInputEffectiveName &&
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
                    <EuiFlexItem key={getInputEffectiveName(packageInput)}>
                      <PackagePolicyInputPanel
                        isSingleInputAndStreams={isSingleInputAndStreams}
                        packageInput={packageInput}
                        packageInfo={packageInfo}
                        packageInputStreams={packageInputStreams}
                        packagePolicyInput={packagePolicyInput}
                        updatePackagePolicyInput={updatePackagePolicyInput}
                        inputValidationResults={
                          validationResults?.inputs?.[
                            buildInputKey(
                              policyInputEffectiveName,
                              policyTemplate.name,
                              hasIntegrations
                            )
                          ] ?? {}
                        }
                        forceShowErrors={submitAttempted}
                        isEditPage={isEditPage}
                        isUpgrade={isUpgrade}
                        isAgentless={deploymentMode === 'agentless'}
                        varGroupSelections={varGroupSelections}
                      />
                      <EuiHorizontalRule margin="m" />
                    </EuiFlexItem>
                  );
                })}
              </React.Fragment>
            );
          })}
          {bottomExtension && <EuiFlexItem>{bottomExtension}</EuiFlexItem>}
        </EuiFlexGroup>
      </>
    ) : (
      <EuiEmptyPrompt
        iconType="checkCircleFill"
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
