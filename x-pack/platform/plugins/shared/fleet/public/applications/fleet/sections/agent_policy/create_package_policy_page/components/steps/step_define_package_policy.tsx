/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiText,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiCallOut,
  EuiSpacer,
  EuiSelect,
  type EuiComboBoxOptionOption,
  EuiIconTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import styled from 'styled-components';

import { NamespaceComboBox } from '../../../../../../../components/namespace_combo_box';
import type { PackageInfo, NewPackagePolicy, RegistryVarsEntry } from '../../../../../types';
import { Loading } from '../../../../../components';
import { useGetEpmDatastreams, useStartServices } from '../../../../../hooks';

import { isAdvancedVar, shouldShowVar, isVarRequiredByVarGroup } from '../../services';
import type { PackagePolicyValidationResults } from '../../services';

import { PackagePolicyInputVarField, VarGroupSelector, useVarGroupSelections } from './components';
import { useOutputs } from './components/hooks';

// on smaller screens, fields should be displayed in one column
const FormGroupResponsiveFields = styled(EuiDescribedFormGroup)`
  @media (max-width: 767px) {
    [class*='euiFlexGroup-responsive'] {
      align-items: flex-start;
    }
  }
`;

export const StepDefinePackagePolicy: React.FunctionComponent<{
  namespacePlaceholder?: string;
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults | undefined;
  submitAttempted: boolean;
  isEditPage?: boolean;
  noAdvancedToggle?: boolean;
  isAgentlessSelected?: boolean;
}> = memo(
  ({
    namespacePlaceholder,
    packageInfo,
    packagePolicy,
    updatePackagePolicy,
    validationResults,
    submitAttempted,
    noAdvancedToggle = false,
    isEditPage = false,
    isAgentlessSelected = false,
  }) => {
    const { docLinks } = useStartServices();

    // Form show/hide states
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(noAdvancedToggle);

    // Var group selections - derives from policy, initializes defaults, handles changes
    const { selections: varGroupSelections, handleSelectionChange: handleVarGroupSelectionChange } =
      useVarGroupSelections({
        varGroups: packageInfo.var_groups,
        savedSelections: packagePolicy.var_group_selections,
        isAgentlessEnabled: isAgentlessSelected,
        onSelectionsChange: updatePackagePolicy,
      });

    // Package-level vars, filtered by var_group visibility
    const { requiredVars, advancedVars } = useMemo(() => {
      const _requiredVars: RegistryVarsEntry[] = [];
      const _advancedVars: RegistryVarsEntry[] = [];

      if (packageInfo.vars) {
        packageInfo.vars.forEach((varDef) => {
          // Check if var should be shown based on var_group selections
          if (
            packageInfo.var_groups &&
            packageInfo.var_groups.length > 0 &&
            !shouldShowVar(varDef.name, packageInfo.var_groups, varGroupSelections)
          ) {
            return; // Skip this var, it's hidden by var_group selection
          }

          if (isAdvancedVar(varDef, packageInfo.var_groups, varGroupSelections)) {
            _advancedVars.push(varDef);
          } else {
            _requiredVars.push(varDef);
          }
        });
      }

      return { requiredVars: _requiredVars, advancedVars: _advancedVars };
    }, [packageInfo.vars, packageInfo.var_groups, varGroupSelections]);

    // Outputs
    const {
      isLoading: isOutputsLoading,
      canUseOutputPerIntegration,
      allowedOutputs,
    } = useOutputs(packagePolicy, packageInfo.name);

    const { data: epmDatastreamsRes } = useGetEpmDatastreams();

    const datastreamsOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
      () =>
        epmDatastreamsRes?.items?.map((item) => ({
          label: item.name,
          value: item.name,
        })) ?? [],
      [epmDatastreamsRes]
    );

    const selectedDatastreamOptions = useMemo<EuiComboBoxOptionOption[]>(
      () =>
        packagePolicy?.additional_datastreams_permissions?.map((item) => ({
          label: item,
          value: item,
        })) ?? [],
      [packagePolicy?.additional_datastreams_permissions]
    );

    // Reset output if switching to agentless and the current
    // selected output is not allowed
    useEffect(() => {
      if (packagePolicy.supports_agentless && packagePolicy.output_id) {
        const currentOutput = allowedOutputs.find((o) => o.id === packagePolicy.output_id);
        if (!currentOutput) {
          updatePackagePolicy({
            output_id: null,
          });
        }
      }
    }, [
      packagePolicy.supports_agentless,
      packagePolicy.output_id,
      allowedOutputs,
      updatePackagePolicy,
    ]);

    const advancedOptionsTitleId = useGeneratedHtmlId();

    // Managed policy
    const isManaged = packagePolicy.is_managed;

    return validationResults ? (
      <>
        {isManaged && (
          <>
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.managedReadonly"
                  defaultMessage="This is a managed package policy. You cannot modify it here."
                />
              }
              iconType="lock"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <FormGroupResponsiveFields
          fullWidth
          title={
            <h3>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.integrationSettingsSectionTitle"
                defaultMessage="Integration settings"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.integrationSettingsSectionDescription"
              defaultMessage="Choose a name and description to help identify how this integration will be used."
            />
          }
        >
          <EuiFlexGroup direction="column" gutterSize="m">
            {/* Name */}
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                isInvalid={!!validationResults.name}
                error={validationResults.name}
                label={
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNameInputLabel"
                    defaultMessage="Integration name"
                  />
                }
              >
                <EuiFieldText
                  isInvalid={!!validationResults.name}
                  fullWidth
                  readOnly={isManaged}
                  value={packagePolicy.name}
                  onChange={(e) =>
                    updatePackagePolicy({
                      name: e.target.value,
                    })
                  }
                  data-test-subj="packagePolicyNameInput"
                />
              </EuiFormRow>
            </EuiFlexItem>

            {/* Description */}
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDescriptionInputLabel"
                    defaultMessage="Description"
                  />
                }
                labelAppend={
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
                      defaultMessage="Optional"
                    />
                  </EuiText>
                }
                isInvalid={!!validationResults.description}
                error={validationResults.description}
              >
                <EuiFieldText
                  isInvalid={!!validationResults.description}
                  fullWidth
                  readOnly={isManaged}
                  value={packagePolicy.description}
                  onChange={(e) =>
                    updatePackagePolicy({
                      description: e.target.value,
                    })
                  }
                  data-test-subj="packagePolicyDescriptionInput"
                />
              </EuiFormRow>
            </EuiFlexItem>

            {/* Var Group Selectors */}
            {packageInfo.var_groups?.map((varGroup) => (
              <EuiFlexItem key={varGroup.name}>
                <VarGroupSelector
                  varGroup={varGroup}
                  selectedOptionName={varGroupSelections[varGroup.name]}
                  onSelectionChange={handleVarGroupSelectionChange}
                  isAgentlessEnabled={isAgentlessSelected}
                />
              </EuiFlexItem>
            ))}

            {/* Required vars */}
            {requiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;
              if (!packagePolicy.vars || !packagePolicy.vars[varName]) return null;
              const value = packagePolicy.vars[varName].value;
              const requiredByVarGroup = isVarRequiredByVarGroup(
                varName,
                packageInfo.var_groups,
                varGroupSelections
              );

              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    onChange={(newValue: any) => {
                      updatePackagePolicy({
                        vars: {
                          ...packagePolicy.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={validationResults?.vars?.[varName] ?? []}
                    forceShowErrors={submitAttempted}
                    isEditPage={isEditPage}
                    isRequiredByVarGroup={requiredByVarGroup}
                  />
                </EuiFlexItem>
              );
            })}

            {/* Advanced options toggle */}
            {!noAdvancedToggle && !isManaged && (
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                      onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                      flush="left"
                      aria-expanded={isShowingAdvanced}
                    >
                      <span id={advancedOptionsTitleId}>
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.advancedOptionsToggleLinkText"
                          defaultMessage="Advanced options"
                        />
                      </span>
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  {!isShowingAdvanced && !!validationResults.namespace ? (
                    <EuiFlexItem grow={false}>
                      <EuiText color="danger" size="s">
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                          defaultMessage="{count, plural, one {# error} other {# errors}}"
                          values={{ count: 1 }}
                        />
                      </EuiText>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {/* Advanced options content */}
            {isShowingAdvanced ? (
              <EuiFlexItem>
                <EuiFlexGroup
                  direction="column"
                  gutterSize="m"
                  role="group"
                  aria-labelledby={advancedOptionsTitleId}
                >
                  {/* Namespace  */}
                  <EuiFlexItem>
                    <NamespaceComboBox
                      namespace={packagePolicy.namespace || ''}
                      placeholder={namespacePlaceholder}
                      isEditPage={isEditPage}
                      packageType={packageInfo.type}
                      validationError={validationResults.namespace}
                      docLinks={docLinks}
                      onNamespaceChange={(newNamespace: string) => {
                        updatePackagePolicy({
                          namespace: newNamespace,
                        });
                      }}
                      data-test-subj="packagePolicyNamespaceInput"
                    />
                  </EuiFlexItem>

                  {/* Output */}
                  {canUseOutputPerIntegration && (
                    <EuiFlexItem>
                      <EuiFormRow
                        label={
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputInputLabel"
                            defaultMessage="Output"
                          />
                        }
                        helpText={
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputHelpLabel"
                            defaultMessage="Change the default output inherited from the parent agent policy. This setting changes where the integration's data is sent."
                          />
                        }
                      >
                        <EuiSelect
                          data-test-subj="packagePolicyOutputInput"
                          isLoading={isOutputsLoading}
                          options={[
                            {
                              value: '',
                              text: '',
                            },
                            ...allowedOutputs.map((output) => ({
                              value: output.id,
                              text: output.name,
                            })),
                          ]}
                          value={packagePolicy.output_id || ''}
                          onChange={(e) => {
                            updatePackagePolicy({
                              output_id: e.target.value.trim() || null,
                            });
                          }}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  )}

                  {/* Data retention settings info */}
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDataRetentionLabel"
                          defaultMessage="Data retention settings"
                        />
                      }
                      helpText={
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDataRetentionText"
                          defaultMessage="By default all logs and metrics data are stored on the hot tier. {learnMore} about changing the data retention policy for this integration."
                          values={{
                            learnMore: (
                              <EuiLink href={docLinks.links.fleet.datastreamsILM} target="_blank">
                                {i18n.translate(
                                  'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDataRetentionLearnMoreLink',
                                  { defaultMessage: 'Learn more' }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      }
                    >
                      <div />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      isInvalid={validationResults?.additional_datastreams_permissions !== null}
                      error={validationResults?.additional_datastreams_permissions ?? []}
                      label={
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.additionalPermissionsLabel"
                          defaultMessage="Add a reroute processor permission {tooltip}"
                          values={{
                            tooltip: (
                              <EuiIconTip
                                content={
                                  <FormattedMessage
                                    id="xpack.fleet.createPackagePolicy.stepConfigure.additionalPermissionsToolTip"
                                    defaultMessage="Use the reroute processor to redirect data flows to another target index or data stream."
                                  />
                                }
                                position="right"
                              />
                            ),
                          }}
                        />
                      }
                    >
                      <EuiComboBox
                        isInvalid={validationResults?.additional_datastreams_permissions !== null}
                        selectedOptions={selectedDatastreamOptions}
                        options={datastreamsOptions}
                        onChange={(val) => {
                          updatePackagePolicy({
                            additional_datastreams_permissions: val.map((v) => v.label),
                          });
                        }}
                        onCreateOption={(option) => {
                          const additionalPermissions =
                            packagePolicy.additional_datastreams_permissions ?? [];

                          updatePackagePolicy({
                            additional_datastreams_permissions: [...additionalPermissions, option],
                          });
                        }}
                        placeholder={i18n.translate(
                          'xpack.fleet.createPackagePolicy.stepConfigure.additionalPermissionsPlaceholder',
                          {
                            defaultMessage: 'Add a permission',
                          }
                        )}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  {/* Advanced vars */}
                  {advancedVars.map((varDef) => {
                    const { name: varName, type: varType } = varDef;
                    if (!packagePolicy.vars || !packagePolicy.vars[varName]) return null;
                    const value = packagePolicy.vars![varName].value;
                    const requiredByVarGroup = isVarRequiredByVarGroup(
                      varName,
                      packageInfo.var_groups,
                      varGroupSelections
                    );
                    return (
                      <EuiFlexItem key={varName}>
                        <PackagePolicyInputVarField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updatePackagePolicy({
                              vars: {
                                ...packagePolicy.vars,
                                [varName]: {
                                  type: varType,
                                  value: newValue,
                                },
                              },
                            });
                          }}
                          errors={validationResults?.vars?.[varName] ?? []}
                          forceShowErrors={submitAttempted}
                          isEditPage={isEditPage}
                          isRequiredByVarGroup={requiredByVarGroup}
                        />
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </FormGroupResponsiveFields>
      </>
    ) : (
      <Loading />
    );
  }
);
