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
  EuiSwitch,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import styled from 'styled-components';

import { isNamespaceAllowedByPrefixes } from '../../../../../../../../common/services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../../constants';
import { NamespaceComboBox } from '../../../../../../../components/namespace_combo_box';
import { CloudConnectorSetup } from '../../../../../../../components/cloud_connector';

import { PackagePolicyCustomFields } from '../../../../../components/custom_fields';
import type {
  PackageInfo,
  NewPackagePolicy,
  RegistryVarsEntry,
  AgentPolicy,
} from '../../../../../types';

import { Loading } from '../../../../../components';
import {
  useGetEpmDatastreams,
  useGetPackagePoliciesQuery,
  useStartServices,
  useVarGroupCloudConnector,
} from '../../../../../hooks';

import { isAdvancedVar, shouldShowVar, isVarRequiredByVarGroup } from '../../services';
import type { PackagePolicyValidationResults } from '../../services';

import { ExperimentalFeaturesService } from '../../../../../services';

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
  agentPolicies?: AgentPolicy[];
  // Namespace-level customization toggle (only rendered when all of the following are provided).
  namespaceCustomizationEnabled?: boolean;
  onNamespaceCustomizationEnabledChange?: (enabled: boolean) => void;
  installedNamespaceCustomizationEnabledFor?: string[];
  allowedNamespacePrefixes?: string[];
  packagePolicyId?: string;
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
    agentPolicies,
    namespaceCustomizationEnabled,
    onNamespaceCustomizationEnabledChange,
    installedNamespaceCustomizationEnabledFor,
    allowedNamespacePrefixes,
    packagePolicyId,
  }) => {
    const { docLinks, cloud } = useStartServices();
    const { enableVarGroups } = ExperimentalFeaturesService.get();

    const varGroups =
      enableVarGroups && packageInfo.var_groups ? packageInfo.var_groups : undefined;

    // Form show/hide states
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(noAdvancedToggle);

    const { selections: varGroupSelections, handleSelectionChange: handleVarGroupSelectionChange } =
      useVarGroupSelections({
        varGroups,
        savedSelections: packagePolicy.var_group_selections,
        isAgentlessEnabled: isAgentlessSelected,
        onSelectionsChange: updatePackagePolicy,
        packagePolicy,
      });

    const {
      isSelected: isCloudConnectorSelected,
      cloudProvider,
      accountType,
      iacTemplateUrl,
      cloudConnectorVars,
      handleCloudConnectorUpdate,
    } = useVarGroupCloudConnector({
      varGroups,
      varGroupSelections,
      packagePolicy,
      updatePackagePolicy,
    });

    // Package-level vars, filtered by var_group visibility
    // and hiding deprecated vars on new installations
    const { requiredVars, advancedVars } = useMemo(() => {
      const _requiredVars: RegistryVarsEntry[] = [];
      const _advancedVars: RegistryVarsEntry[] = [];

      if (packageInfo.vars) {
        packageInfo.vars.forEach((varDef) => {
          if (cloudConnectorVars.has(varDef.name) || (!isEditPage && !!varDef.deprecated)) {
            return;
          }

          // Check if var should be shown based on var_group selections
          if (
            varGroups &&
            varGroups.length > 0 &&
            !shouldShowVar(varDef.name, varGroups, varGroupSelections)
          ) {
            return; // Skip this var, it's hidden by var_group selection
          }

          if (isAdvancedVar(varDef, varGroups, varGroupSelections)) {
            _advancedVars.push(varDef);
          } else {
            _requiredVars.push(varDef);
          }
        });
      }

      return { requiredVars: _requiredVars, advancedVars: _advancedVars };
    }, [packageInfo.vars, varGroups, varGroupSelections, cloudConnectorVars, isEditPage]);

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

    // True only if the package policy itself is managed (e.g. Synthetics-created policies).
    // Controls the read-only callout, readonly name/description fields, and hidden advanced toggle.
    const isManaged = packagePolicy.is_managed;

    // Output is also disabled when any parent agent policy is managed (e.g. Elastic Cloud Agent Policy).
    const isOutputDisabled = isManaged || agentPolicies?.some((p) => p.is_managed) === true;

    // Namespace-level customization toggle visibility/state.
    const showNamespaceCustomizationToggle =
      onNamespaceCustomizationEnabledChange !== undefined &&
      installedNamespaceCustomizationEnabledFor !== undefined &&
      allowedNamespacePrefixes !== undefined;

    const currentNamespace = packagePolicy.namespace?.trim() ?? '';
    const namespacePrefixesForCheck =
      allowedNamespacePrefixes && allowedNamespacePrefixes.length > 0
        ? allowedNamespacePrefixes
        : null;
    const isNamespacePrefixAllowed = currentNamespace
      ? isNamespaceAllowedByPrefixes(currentNamespace, namespacePrefixesForCheck)
      : true;
    const isNamespaceCustomizationInputDisabled =
      !currentNamespace || isManaged || !isNamespacePrefixAllowed;

    // When the namespace changes to one that can't use customization, auto-reset the toggle so
    // stale "enabled" state doesn't persist across namespace edits or form reuse.
    useEffect(() => {
      if (isNamespaceCustomizationInputDisabled && namespaceCustomizationEnabled) {
        onNamespaceCustomizationEnabledChange?.(false);
      }
    }, [
      isNamespaceCustomizationInputDisabled,
      namespaceCustomizationEnabled,
      onNamespaceCustomizationEnabledChange,
    ]);

    // Whether the current namespace is already opted in to namespace-level customization.
    const isOptedIn = !!installedNamespaceCustomizationEnabledFor?.includes(currentNamespace);

    // Query other policies for the same package + namespace to determine impact warnings.
    // Only fires when a warning is possible:
    //   Case 3: toggle on  + namespace not yet opted in → opting in may affect others
    //   Case 8: toggle off + namespace already opted in → opting out may affect others
    const otherPoliciesQuery = useGetPackagePoliciesQuery(
      {
        perPage: SO_SEARCH_LIMIT,
        page: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${packageInfo.name}" and ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.namespace:"${currentNamespace}"`,
      },
      {
        enabled:
          showNamespaceCustomizationToggle &&
          !isNamespaceCustomizationInputDisabled &&
          !!namespaceCustomizationEnabled !== isOptedIn,
      }
    );
    const otherPoliciesCount =
      otherPoliciesQuery.data?.items?.filter((item) => item.id !== packagePolicyId).length ?? 0;

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
            {varGroups?.map((varGroup) => (
              <EuiFlexItem key={varGroup.name}>
                <VarGroupSelector
                  varGroup={varGroup}
                  selectedOptionName={varGroupSelections[varGroup.name]}
                  onSelectionChange={handleVarGroupSelectionChange}
                  isAgentlessEnabled={isAgentlessSelected}
                  disabled={isEditPage && isCloudConnectorSelected}
                />
              </EuiFlexItem>
            ))}

            {/* Cloud Connector Setup - shown when a cloud connector option is selected */}
            {isCloudConnectorSelected && cloudProvider && (
              <EuiFlexItem>
                <CloudConnectorSetup
                  newPolicy={packagePolicy}
                  packageInfo={packageInfo}
                  updatePolicy={handleCloudConnectorUpdate}
                  isEditPage={isEditPage}
                  hasInvalidRequiredVars={submitAttempted && !!validationResults?.vars}
                  cloud={cloud}
                  cloudProvider={cloudProvider}
                  templateName={packageInfo.name}
                  iacTemplateUrl={iacTemplateUrl}
                  accountType={accountType}
                />
              </EuiFlexItem>
            )}

            {/* Required vars */}
            {requiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;
              if (!packagePolicy.vars || !packagePolicy.vars[varName]) return null;
              const value = packagePolicy.vars[varName].value;
              const requiredByVarGroup = isVarRequiredByVarGroup(
                varName,
                varGroups,
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
                      iconType={isShowingAdvanced ? 'chevronSingleDown' : 'chevronSingleRight'}
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

                  {/* Namespace-level customization toggle */}
                  {showNamespaceCustomizationToggle && (
                    <EuiFlexItem>
                      <EuiToolTip
                        position="top"
                        content={
                          !currentNamespace
                            ? i18n.translate(
                                'xpack.fleet.createPackagePolicy.namespaceCustomization.disabledMissingNamespace',
                                {
                                  defaultMessage:
                                    'Enter a namespace before enabling namespace-level customization.',
                                }
                              )
                            : !isNamespacePrefixAllowed
                            ? i18n.translate(
                                'xpack.fleet.createPackagePolicy.namespaceCustomization.disabledPrefix',
                                {
                                  defaultMessage:
                                    'This namespace does not match an allowed prefix for this space, so namespace-level customization cannot be enabled.',
                                }
                              )
                            : isManaged
                            ? i18n.translate(
                                'xpack.fleet.createPackagePolicy.namespaceCustomization.disabledManaged',
                                {
                                  defaultMessage:
                                    'Namespace-level customization cannot be changed on a managed integration policy.',
                                }
                              )
                            : ''
                        }
                      >
                        <EuiSwitch
                          data-test-subj="packagePolicyNamespaceCustomizationToggle"
                          label={i18n.translate(
                            'xpack.fleet.createPackagePolicy.namespaceCustomization.label',
                            { defaultMessage: 'Enable namespace-level customization' }
                          )}
                          checked={!!namespaceCustomizationEnabled}
                          disabled={isNamespaceCustomizationInputDisabled}
                          onChange={(e) =>
                            onNamespaceCustomizationEnabledChange?.(e.target.checked)
                          }
                        />
                      </EuiToolTip>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.namespaceCustomization.helpText"
                          defaultMessage="Allows applying customized settings to all data streams in that namespace."
                        />
                      </EuiText>
                      {/* Case 3: toggle on, not yet opted in, others share namespace */}
                      {namespaceCustomizationEnabled && !isOptedIn && otherPoliciesCount > 0 && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiCallOut
                            announceOnMount
                            iconType="warning"
                            color="warning"
                            size="s"
                            data-test-subj="packagePolicyNamespaceCustomizationOptInImpactWarning"
                            title={i18n.translate(
                              'xpack.fleet.createPackagePolicy.namespaceCustomization.optInImpactTitle',
                              {
                                defaultMessage:
                                  'Enabling customization will affect {count, plural, one {# other policy} other {# other policies}}',
                                values: { count: otherPoliciesCount },
                              }
                            )}
                          >
                            <FormattedMessage
                              id="xpack.fleet.createPackagePolicy.namespaceCustomization.optInImpactDescription"
                              defaultMessage="Namespace-level customization is shared across all {packageTitle} integration policies targeting namespace {namespace}. Enabling it here will apply to all of them."
                              values={{
                                packageTitle: packageInfo.title,
                                namespace: <strong>{currentNamespace}</strong>,
                              }}
                            />
                          </EuiCallOut>
                        </>
                      )}
                      {/* Case 8: toggle off, currently opted in, others share namespace */}
                      {!namespaceCustomizationEnabled && isOptedIn && otherPoliciesCount > 0 && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiCallOut
                            announceOnMount
                            iconType="warning"
                            color="warning"
                            size="s"
                            data-test-subj="packagePolicyNamespaceCustomizationOptOutImpactWarning"
                            title={i18n.translate(
                              'xpack.fleet.createPackagePolicy.namespaceCustomization.optOutImpactTitle',
                              {
                                defaultMessage:
                                  'Disabling customization will affect {count, plural, one {# other policy} other {# other policies}}',
                                values: { count: otherPoliciesCount },
                              }
                            )}
                          >
                            <FormattedMessage
                              id="xpack.fleet.createPackagePolicy.namespaceCustomization.optOutImpactDescription"
                              defaultMessage="Namespace-level customization is shared across all {packageTitle} integration policies targeting namespace {namespace}. Disabling it here will remove it from all of them."
                              values={{
                                packageTitle: packageInfo.title,
                                namespace: <strong>{currentNamespace}</strong>,
                              }}
                            />
                          </EuiCallOut>
                        </>
                      )}
                    </EuiFlexItem>
                  )}

                  {/* Output */}
                  {canUseOutputPerIntegration && (
                    <EuiFlexItem>
                      <EuiFormRow
                        label={
                          <>
                            <FormattedMessage
                              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputInputLabel"
                              defaultMessage="Output"
                            />
                            {isOutputDisabled && (
                              <>
                                {' '}
                                <EuiIconTip
                                  type="question"
                                  color="subdued"
                                  content={
                                    <FormattedMessage
                                      id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputDisabledTooltip"
                                      defaultMessage="Output cannot be modified because this integration is used by a managed agent policy."
                                    />
                                  }
                                />
                              </>
                            )}
                          </>
                        }
                        helpText={
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyOutputHelpLabel"
                            defaultMessage="Change the default output inherited from the parent agent policy. This setting changes where the integration's data is sent."
                          />
                        }
                      >
                        <EuiSelect
                          disabled={isOutputDisabled}
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
                      varGroups,
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
                  {/* Custom fields — agentless only */}
                  {isAgentlessSelected && (
                    <EuiFlexItem>
                      <PackagePolicyCustomFields
                        packagePolicy={packagePolicy}
                        updatePackagePolicy={updatePackagePolicy}
                      />
                    </EuiFlexItem>
                  )}
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
