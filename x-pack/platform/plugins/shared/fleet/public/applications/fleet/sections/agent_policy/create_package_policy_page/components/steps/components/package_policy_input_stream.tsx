/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { uniq } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiRadioGroup,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  useIsWithinMinBreakpoint,
  EuiAccordion,
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';

import { useQuery } from '@kbn/react-query';

import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  OTEL_COLLECTOR_INPUT_TYPE,
} from '../../../../../../../../../common/constants';

import { sendGetDataStreams, useStartServices } from '../../../../../../../../hooks';

import {
  getRegistryDataStreamAssetBaseName,
  isInputOnlyPolicyTemplate,
  mapPackageReleaseToIntegrationCardRelease,
} from '../../../../../../../../../common/services';

import type {
  NewPackagePolicyInputStream,
  PackageInfo,
  RegistryStreamWithDataStream,
  RegistryVarsEntry,
} from '../../../../../../types';
import { InlineReleaseBadge } from '../../../../../../components';
import type { PackagePolicyConfigValidationResults } from '../../../services';
import { isAdvancedVar, validationHasErrors } from '../../../services';
import { PackagePolicyEditorDatastreamPipelines } from '../../datastream_pipelines';
import { PackagePolicyEditorDatastreamMappings } from '../../datastream_mappings';
import { useAgentless } from '../../../single_page_layout/hooks/setup_technology';

import { useIndexTemplateExists } from '../../datastream_hooks';

import type { RegistryPolicyInputOnlyTemplate } from '../../../../../../../../../common/types/models/epm';
import { shouldShowVar, isVarRequiredByVarGroup } from '../../../services/var_group_helpers';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { useDataStreamId, useVarGroupSelections } from './hooks';
import { sortDatastreamsByDataset } from './sort_datastreams';
import { VarGroupSelector } from './var_group_selector';

const ScrollAnchor = styled.div`
  display: none;
  scroll-margin-top: var(--euiFixedHeadersOffset, 0);
`;

interface Props {
  packageInputStream: RegistryStreamWithDataStream;
  packageInfo: PackageInfo;
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  inputStreamValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
  isEditPage?: boolean;
  totalStreams?: number;
  varGroupSelections?: Record<string, string>;
}

export const PackagePolicyInputStreamConfig = memo<Props>(
  ({
    packageInputStream,
    packageInfo,
    packagePolicyInputStream,
    updatePackagePolicyInputStream,
    inputStreamValidationResults,
    forceShowErrors,
    isEditPage,
    totalStreams,
    varGroupSelections = {},
  }) => {
    const { docLinks } = useStartServices();
    const { isAgentlessEnabled } = useAgentless();

    const {
      params: { packagePolicyId },
    } = useRouteMatch<{ packagePolicyId?: string }>();
    const defaultDataStreamId = useDataStreamId();
    const containerRef = useRef<HTMLDivElement>(null);

    const isDefaultDatastream =
      !!defaultDataStreamId &&
      !!packagePolicyInputStream.id &&
      packagePolicyInputStream.id === defaultDataStreamId;
    const isPackagePolicyEdit = !!packagePolicyId;
    const shouldShowStreamsToggles = totalStreams ? totalStreams > 1 : true;
    const customDatasetVar = packagePolicyInputStream.vars?.[DATASET_VAR_NAME];
    const customDatasetVarValue = customDatasetVar?.value?.dataset || customDatasetVar?.value;

    const customDataStreamTypeVar = packagePolicyInputStream.vars?.[DATA_STREAM_TYPE_VAR_NAME];

    // Check if package uses dynamic_signal_types
    const dynamicSignalTypes = useMemo(() => {
      const inputOnlyTemplate = packageInfo?.policy_templates?.find(
        (template) =>
          isInputOnlyPolicyTemplate(template) && template.input === OTEL_COLLECTOR_INPUT_TYPE
      ) as RegistryPolicyInputOnlyTemplate | undefined;

      return inputOnlyTemplate?.dynamic_signal_types === true;
    }, [packageInfo?.policy_templates]);

    const customDataStreamTypeVarValue =
      customDataStreamTypeVar?.value || packagePolicyInputStream.data_stream.type || 'logs';

    const dataStreamTypeOptions = useMemo(() => {
      return [
        { id: 'logs', label: 'Logs' },
        { id: 'metrics', label: 'Metrics' },
        { id: 'traces', label: 'Traces' },
      ];
    }, []);

    const { exists: indexTemplateExists, isLoading: isLoadingIndexTemplate } =
      useIndexTemplateExists(
        getRegistryDataStreamAssetBaseName({
          dataset: customDatasetVarValue || packageInputStream.data_stream.dataset,
          type: packageInputStream.data_stream.type,
        }),
        isPackagePolicyEdit
      );

    // only show pipelines and mappings if the matching index template exists
    // in the legacy case (e.g logs package pre 2.0.0) the index template will not exist
    // because we allowed dataset to be customized but didnt create a matching index template
    // for the new dataset.
    const showPipelinesAndMappings = !isLoadingIndexTemplate && indexTemplateExists;

    useEffect(() => {
      if (isDefaultDatastream && containerRef.current) {
        containerRef.current.scrollIntoView();
      }
    }, [isDefaultDatastream, containerRef]);

    // Determine if this stream has its own var_groups (stream-level) or should use package-level
    const hasStreamLevelVarGroups =
      packageInputStream.var_groups && packageInputStream.var_groups.length > 0;

    // Use stream-level var_groups if present, otherwise fall back to package-level
    const effectiveVarGroups = hasStreamLevelVarGroups
      ? packageInputStream.var_groups
      : packageInfo.var_groups;

    // Stream-level var group selections - derives from policy, initializes defaults, handles changes
    const {
      selections: streamVarGroupSelections,
      handleSelectionChange: handleStreamVarGroupSelectionChange,
    } = useVarGroupSelections({
      varGroups: hasStreamLevelVarGroups ? packageInputStream.var_groups : undefined,
      savedSelections: packagePolicyInputStream.var_group_selections,
      isAgentlessEnabled,
      onSelectionsChange: updatePackagePolicyInputStream,
    });

    // Use stream-level selections, or fall back to package-level prop
    const effectiveVarGroupSelections = hasStreamLevelVarGroups
      ? streamVarGroupSelections
      : varGroupSelections;

    // Split vars into required and advanced, filtering by var_group visibility
    const [requiredVars, advancedVars] = useMemo(() => {
      const _requiredVars: RegistryVarsEntry[] = [];
      const _advancedVars: RegistryVarsEntry[] = [];

      if (packageInputStream.vars && packageInputStream.vars.length) {
        packageInputStream.vars.forEach((varDef) => {
          // Check if var should be shown based on var_group selections
          // Use effective var_groups (stream-level if present, otherwise package-level)
          if (
            effectiveVarGroups &&
            effectiveVarGroups.length > 0 &&
            !shouldShowVar(varDef.name, effectiveVarGroups, effectiveVarGroupSelections)
          ) {
            return; // Skip this var, it's hidden by var_group selection
          }

          if (isAdvancedVar(varDef, effectiveVarGroups, effectiveVarGroupSelections)) {
            _advancedVars.push(varDef);
          } else {
            _requiredVars.push(varDef);
          }
        });
      }
      return [_requiredVars, _advancedVars];
    }, [packageInputStream, effectiveVarGroups, effectiveVarGroupSelections]);

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputStreamValidationResults);
    const hasRequiredVarGroupErrors = inputStreamValidationResults?.required_vars;
    const advancedVarsWithErrorsCount: number = useMemo(
      () =>
        advancedVars.filter(
          ({ name: varName }) => inputStreamValidationResults?.vars?.[varName]?.length
        ).length,
      [advancedVars, inputStreamValidationResults?.vars]
    );

    const { data: dataStreamsData } = useQuery(['datastreams'], () => sendGetDataStreams(), {
      enabled: packageInfo.type === 'input', // Only fetch datastream for input type package
    });
    const datasetList = uniq(dataStreamsData?.data_streams) ?? [];
    const datastreams = sortDatastreamsByDataset(datasetList, packageInfo.name);

    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(isDefaultDatastream);
    const hasAdvancedOptions = useMemo(() => {
      return advancedVars.length > 0 || (isPackagePolicyEdit && showPipelinesAndMappings);
    }, [advancedVars.length, isPackagePolicyEdit, showPipelinesAndMappings]);

    const isBiggerScreen = useIsWithinMinBreakpoint('xxl');
    const flexWidth = isBiggerScreen ? 7 : 5;

    return (
      <>
        <EuiFlexGrid
          columns={2}
          data-test-subj={`streamOptions.inputStreams.${packageInputStream.data_stream.dataset}`}
        >
          <ScrollAnchor ref={containerRef} />
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart">
              <EuiFlexItem grow={1} />
              <EuiFlexItem grow={flexWidth}>
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="flexStart"
                  justifyContent="spaceBetween"
                >
                  {packageInfo.type !== 'input' && shouldShowStreamsToggles && (
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        data-test-subj="streamOptions.switch"
                        label={packageInputStream.title}
                        disabled={packagePolicyInputStream.keep_enabled}
                        checked={packagePolicyInputStream.enabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          updatePackagePolicyInputStream({
                            enabled,
                          });
                        }}
                      />
                    </EuiFlexItem>
                  )}
                  {packageInputStream.data_stream.release &&
                  packageInputStream.data_stream.release !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <InlineReleaseBadge
                        release={mapPackageReleaseToIntegrationCardRelease(
                          packageInputStream.data_stream.release
                        )}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                {packageInfo.type !== 'input' &&
                packageInputStream.description &&
                shouldShowStreamsToggles ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="s" color="subdued">
                      <ReactMarkdown>{packageInputStream.description}</ReactMarkdown>
                    </EuiText>
                  </>
                ) : null}
                {hasRequiredVarGroupErrors && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiAccordion
                      id={`${packageInputStream.data_stream.type}-${packageInputStream.data_stream.dataset}-required-vars-group-error`}
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
                        {Object.entries(inputStreamValidationResults?.required_vars || {}).map(
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
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              {/* Stream-level Var Group Selectors */}
              {hasStreamLevelVarGroups &&
                packageInputStream.var_groups?.map((varGroup) => (
                  <EuiFlexItem key={varGroup.name}>
                    <VarGroupSelector
                      varGroup={varGroup}
                      selectedOptionName={streamVarGroupSelections[varGroup.name]}
                      onSelectionChange={handleStreamVarGroupSelectionChange}
                      isAgentlessEnabled={isAgentlessEnabled}
                    />
                  </EuiFlexItem>
                ))}

              {requiredVars.map((varDef) => {
                if (!packagePolicyInputStream?.vars) return null;
                const { name: varName, type: varType } = varDef;
                const varConfigEntry = packagePolicyInputStream.vars?.[varName];
                const value = varConfigEntry?.value;
                const frozen = varConfigEntry?.frozen ?? false;
                const requiredByVarGroup = isVarRequiredByVarGroup(
                  varName,
                  effectiveVarGroups,
                  effectiveVarGroupSelections
                );
                return (
                  <EuiFlexItem key={varName}>
                    <PackagePolicyInputVarField
                      varDef={varDef}
                      value={value}
                      frozen={frozen}
                      onChange={(newValue: any) => {
                        updatePackagePolicyInputStream({
                          vars: {
                            ...packagePolicyInputStream.vars,
                            [varName]: {
                              type: varType,
                              value: newValue,
                            },
                          },
                        });
                      }}
                      errors={inputStreamValidationResults?.vars?.[varName]}
                      forceShowErrors={forceShowErrors}
                      packageType={packageInfo.type}
                      packageName={packageInfo.name}
                      datastreams={datastreams}
                      isEditPage={isEditPage}
                      isRequiredByVarGroup={requiredByVarGroup}
                    />
                  </EuiFlexItem>
                );
              })}

              {/* Advanced section */}
              {(hasAdvancedOptions || packageInfo.type === 'input') && (
                <Fragment>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          aria-label="Advanced options"
                          size="xs"
                          iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                          onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                          flush="left"
                          data-test-subj={`advancedStreamOptionsToggle-${packagePolicyInputStream.id}`}
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
                  {isShowingAdvanced ? (
                    <>
                      {packageInfo.type === 'input' && !dynamicSignalTypes && (
                        <EuiFlexItem>
                          <EuiFormRow
                            label={
                              <FormattedMessage
                                id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDataStreamTypeInputLabel"
                                defaultMessage="Data Stream Type"
                              />
                            }
                            helpText={
                              isEditPage ? (
                                <FormattedMessage
                                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyInputOnlyEditDataStreamTypeHelpLabel"
                                  defaultMessage="The data stream type cannot be changed for this integration. Create a new integration policy to use a different input type."
                                />
                              ) : (
                                <FormattedMessage
                                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDataStreamTypeHelpLabel"
                                  defaultMessage="Select a data stream type for this policy. This setting changes the name of the integration's data stream. {learnMore}."
                                  values={{
                                    learnMore: (
                                      <EuiLink
                                        href={docLinks.links.fleet.datastreamsNamingScheme}
                                        target="_blank"
                                      >
                                        {i18n.translate(
                                          'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceHelpLearnMoreLabel',
                                          { defaultMessage: 'Learn more' }
                                        )}
                                      </EuiLink>
                                    ),
                                  }}
                                />
                              )
                            }
                          >
                            <EuiRadioGroup
                              data-test-subj="packagePolicyDataStreamType"
                              disabled={isEditPage}
                              idSelected={customDataStreamTypeVarValue}
                              options={dataStreamTypeOptions}
                              onChange={(type: string) => {
                                updatePackagePolicyInputStream({
                                  vars: {
                                    ...packagePolicyInputStream.vars,
                                    [DATA_STREAM_TYPE_VAR_NAME]: {
                                      type: 'string',
                                      value: type,
                                    },
                                  },
                                });
                              }}
                              name="dataStreamType"
                            />
                          </EuiFormRow>
                        </EuiFlexItem>
                      )}
                      {advancedVars.map((varDef) => {
                        if (!packagePolicyInputStream.vars) return null;
                        const { name: varName, type: varType } = varDef;
                        const value = packagePolicyInputStream.vars?.[varName]?.value;
                        const requiredByVarGroup = isVarRequiredByVarGroup(
                          varName,
                          effectiveVarGroups,
                          effectiveVarGroupSelections
                        );

                        return (
                          <EuiFlexItem key={varName}>
                            <PackagePolicyInputVarField
                              varDef={varDef}
                              value={value}
                              onChange={(newValue: any) => {
                                updatePackagePolicyInputStream({
                                  vars: {
                                    ...packagePolicyInputStream.vars,
                                    [varName]: {
                                      type: varType,
                                      value: newValue,
                                    },
                                  },
                                });
                              }}
                              errors={inputStreamValidationResults?.vars?.[varName]}
                              forceShowErrors={forceShowErrors}
                              packageType={packageInfo.type}
                              packageName={packageInfo.name}
                              datastreams={datastreams}
                              isEditPage={isEditPage}
                              isRequiredByVarGroup={requiredByVarGroup}
                            />
                          </EuiFlexItem>
                        );
                      })}
                      {isPackagePolicyEdit && showPipelinesAndMappings && (
                        <>
                          <EuiFlexItem>
                            <PackagePolicyEditorDatastreamPipelines
                              packageInputStream={packagePolicyInputStream}
                              packageInfo={packageInfo}
                              customDataset={customDatasetVarValue}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <PackagePolicyEditorDatastreamMappings
                              packageInputStream={packagePolicyInputStream}
                              packageInfo={packageInfo}
                              customDataset={customDatasetVarValue}
                            />
                          </EuiFlexItem>
                        </>
                      )}
                    </>
                  ) : null}
                </Fragment>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </>
    );
  }
);
