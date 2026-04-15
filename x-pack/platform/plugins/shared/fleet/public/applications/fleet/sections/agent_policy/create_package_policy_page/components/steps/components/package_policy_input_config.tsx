/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  useIsWithinMinBreakpoint,
  EuiAccordion,
} from '@elastic/eui';

import type {
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  RegistryVarGroup,
  RegistryVarsEntry,
} from '../../../../../../types';
import type { PackagePolicyConfigValidationResults } from '../../../services';
import { isAdvancedVar, validationHasErrors } from '../../../services';
import { shouldShowVar, getVarsControlledByVarGroups } from '../../../services/var_group_helpers';
import type { VarGroupSelection } from '../../../services/var_group_helpers';
import { useAgentless } from '../../../single_page_layout/hooks/setup_technology';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { VarGroupSelector } from './var_group_selector';

export interface StreamAdvancedVarsConfig {
  vars: RegistryVarsEntry[];
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  validationResults: PackagePolicyConfigValidationResults;
}

export const PackagePolicyInputConfig: React.FunctionComponent<{
  hasInputStreams: boolean;
  packageInputVars?: RegistryVarsEntry[];
  packagePolicyInput: NewPackagePolicyInput;
  updatePackagePolicyInput: (updatedInput: Partial<NewPackagePolicyInput>) => void;
  inputValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
  isEditPage?: boolean;
  varGroups?: RegistryVarGroup[];
  varGroupSelections?: VarGroupSelection;
  onVarGroupSelectionChange?: (groupName: string, optionName: string) => void;
  showDescriptionColumn?: boolean;
  streamAdvancedVars?: StreamAdvancedVarsConfig;
}> = memo(
  ({
    hasInputStreams,
    packageInputVars,
    packagePolicyInput,
    updatePackagePolicyInput,
    inputValidationResults,
    forceShowErrors,
    isEditPage = false,
    varGroups,
    varGroupSelections = {},
    onVarGroupSelectionChange,
    showDescriptionColumn = true,
    streamAdvancedVars,
  }) => {
    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);
    const { isAgentlessEnabled } = useAgentless();

    // Split vars into required and advanced, filtering by var_group visibility and deprecated vars.
    // Required vars are further split into pre-group (not controlled by any var_group, rendered
    // above var_group selectors) and post-group (controlled by a selected var_group option,
    // rendered below var_group selectors) to preserve manifest declaration order intent.
    const [preGroupRequiredVars, postGroupRequiredVars, advancedVars] = useMemo(() => {
      const _advancedVars: RegistryVarsEntry[] = [];
      const _preGroupVars: RegistryVarsEntry[] = [];
      const _postGroupVars: RegistryVarsEntry[] = [];
      const controlledVars = varGroups?.length ? getVarsControlledByVarGroups(varGroups) : null;
      (packageInputVars || []).forEach((varDef) => {
        if (!isEditPage && !!varDef.deprecated) {
          return;
        }
        if (
          varGroups &&
          varGroups.length > 0 &&
          !shouldShowVar(varDef.name, varGroups, varGroupSelections)
        ) {
          return;
        }
        if (isAdvancedVar(varDef, varGroups, varGroupSelections)) {
          _advancedVars.push(varDef);
        } else if (controlledVars?.has(varDef.name)) {
          // Var is controlled by a var_group option — render after the var_group selector
          _postGroupVars.push(varDef);
        } else {
          // Var is independent of var_groups — render before the var_group selector
          _preGroupVars.push(varDef);
        }
      });
      return [_preGroupVars, _postGroupVars, _advancedVars];
    }, [packageInputVars, varGroups, varGroupSelections, isEditPage]);

    const allAdvancedVars = useMemo(() => {
      if (!streamAdvancedVars?.vars.length) {
        return advancedVars;
      }
      return [...advancedVars, ...streamAdvancedVars.vars];
    }, [advancedVars, streamAdvancedVars]);

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputValidationResults);
    const hasRequiredVarGroupErrors = inputValidationResults.required_vars;
    const advancedVarsWithErrorsCount: number = useMemo(() => {
      let count = advancedVars.filter(
        ({ name: varName }) => inputValidationResults.vars?.[varName]?.length
      ).length;
      if (streamAdvancedVars) {
        count += streamAdvancedVars.vars.filter(
          ({ name: varName }) => streamAdvancedVars.validationResults.vars?.[varName]?.length
        ).length;
      }
      return count;
    }, [advancedVars, inputValidationResults.vars, streamAdvancedVars]);

    const isBiggerScreen = useIsWithinMinBreakpoint('xxl');
    const flexWidth = isBiggerScreen ? 7 : 5;

    return (
      <EuiFlexGrid columns={showDescriptionColumn ? 2 : 1} gutterSize="l">
        {showDescriptionColumn ? (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart">
              <EuiFlexItem grow={1} />
              <EuiFlexItem grow={flexWidth}>
                <EuiText>
                  <h4>
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.inputSettingsTitle"
                      defaultMessage="Settings"
                    />
                  </h4>
                </EuiText>
                {hasInputStreams ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText color="subdued" size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.inputSettingsDescription"
                          defaultMessage="The following settings are applicable to all inputs below."
                        />
                      </p>
                    </EuiText>
                  </>
                ) : null}
                {hasRequiredVarGroupErrors && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiAccordion
                      id={`${packagePolicyInput.type}-required-vars-group-error`}
                      paddingSize="s"
                      buttonContent={
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.requiredVarsGroupErrorText"
                            defaultMessage="One of these settings groups is required"
                          />
                        </EuiText>
                      }
                    >
                      <EuiText size="xs" color="danger">
                        {Object.entries(inputValidationResults.required_vars || {}).map(
                          ([groupName, vars]) => {
                            return (
                              <>
                                <strong>{groupName}</strong>
                                <ul>
                                  {vars.map(({ name }) => (
                                    <li key={`${groupName}-${name}`}>{name}</li>
                                  ))}
                                </ul>
                              </>
                            );
                          }
                        )}
                      </EuiText>
                    </EuiAccordion>
                  </>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            {preGroupRequiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;

              const value = packagePolicyInput.vars?.[varName]?.value;
              const frozen = packagePolicyInput.vars?.[varName]?.frozen;

              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    frozen={frozen}
                    onChange={(newValue: any) => {
                      updatePackagePolicyInput({
                        vars: {
                          ...packagePolicyInput.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={inputValidationResults.vars?.[varName]}
                    forceShowErrors={forceShowErrors}
                    isEditPage={isEditPage}
                  />
                </EuiFlexItem>
              );
            })}
            {varGroups?.map((varGroup) => (
              <EuiFlexItem key={varGroup.name}>
                <VarGroupSelector
                  varGroup={varGroup}
                  selectedOptionName={varGroupSelections[varGroup.name]}
                  onSelectionChange={onVarGroupSelectionChange ?? (() => {})}
                  isAgentlessEnabled={isAgentlessEnabled}
                />
              </EuiFlexItem>
            ))}
            {postGroupRequiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;

              const value = packagePolicyInput.vars?.[varName]?.value;
              const frozen = packagePolicyInput.vars?.[varName]?.frozen;

              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    frozen={frozen}
                    onChange={(newValue: any) => {
                      updatePackagePolicyInput({
                        vars: {
                          ...packagePolicyInput.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={inputValidationResults.vars?.[varName]}
                    forceShowErrors={forceShowErrors}
                    isEditPage={isEditPage}
                  />
                </EuiFlexItem>
              );
            })}
            {allAdvancedVars.length ? (
              <Fragment>
                <EuiFlexItem>
                  {/* Wrapper div to prevent button from going full width */}
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={isShowingAdvanced ? 'chevronSingleDown' : 'chevronSingleRight'}
                        onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                        flush="left"
                      >
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                            defaultMessage="{count, plural, one {# error} other {# errors}}"
                            values={{ count: advancedVarsWithErrorsCount }}
                          />
                        </EuiText>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
                {isShowingAdvanced
                  ? advancedVars.map((varDef) => {
                      const { name: varName, type: varType } = varDef;
                      const value = packagePolicyInput.vars?.[varName]?.value;
                      return (
                        <EuiFlexItem key={varName}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackagePolicyInput({
                                vars: {
                                  ...packagePolicyInput.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={inputValidationResults.vars?.[varName]}
                            forceShowErrors={forceShowErrors}
                            isEditPage={isEditPage}
                          />
                        </EuiFlexItem>
                      );
                    })
                  : null}
                {isShowingAdvanced && streamAdvancedVars
                  ? streamAdvancedVars.vars.map((varDef) => {
                      const { name: varName, type: varType } = varDef;
                      const value =
                        streamAdvancedVars.packagePolicyInputStream.vars?.[varName]?.value;
                      return (
                        <EuiFlexItem key={`stream-${varName}`}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              streamAdvancedVars.updatePackagePolicyInputStream({
                                vars: {
                                  ...streamAdvancedVars.packagePolicyInputStream.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={streamAdvancedVars.validationResults.vars?.[varName]}
                            forceShowErrors={forceShowErrors}
                            isEditPage={isEditPage}
                          />
                        </EuiFlexItem>
                      );
                    })
                  : null}
              </Fragment>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }
);
