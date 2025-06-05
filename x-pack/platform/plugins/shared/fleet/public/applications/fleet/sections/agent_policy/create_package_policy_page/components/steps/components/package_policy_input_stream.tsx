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

import { useQuery } from '@tanstack/react-query';

import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
} from '../../../../../../../../../common/constants';

import { useConfig, sendGetDataStreams, useStartServices } from '../../../../../../../../hooks';

import {
  getRegistryDataStreamAssetBaseName,
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

import { useIndexTemplateExists } from '../../datastream_hooks';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { useDataStreamId } from './hooks';
import { sortDatastreamsByDataset } from './sort_datastreams';

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
  }) => {
    const { docLinks } = useStartServices();

    const config = useConfig();
    const isExperimentalDataStreamSettingsEnabled =
      config.enableExperimental?.includes('experimentalDataStreamSettings') ?? false;

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
    const customDataStreamTypeVarValue =
      customDataStreamTypeVar?.value || packagePolicyInputStream.data_stream.type || 'logs';

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

    // Split vars into required and advanced
    const [requiredVars, advancedVars] = useMemo(() => {
      const _requiredVars: RegistryVarsEntry[] = [];
      const _advancedVars: RegistryVarsEntry[] = [];

      if (packageInputStream.vars && packageInputStream.vars.length) {
        packageInputStream.vars.forEach((varDef) => {
          if (isAdvancedVar(varDef)) {
            _advancedVars.push(varDef);
          } else {
            _requiredVars.push(varDef);
          }
        });
      }
      return [_requiredVars, _advancedVars];
    }, [packageInputStream]);

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
      return (
        advancedVars.length > 0 ||
        (isPackagePolicyEdit && showPipelinesAndMappings) ||
        isExperimentalDataStreamSettingsEnabled
      );
    }, [
      advancedVars.length,
      isExperimentalDataStreamSettingsEnabled,
      isPackagePolicyEdit,
      showPipelinesAndMappings,
    ]);

    const isBiggerScreen = useIsWithinMinBreakpoint('xxl');
    const flexWidth = isBiggerScreen ? 7 : 5;

    return (
      <>
        <EuiFlexGrid columns={2} data-test-subj="streamOptions.inputStreams">
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
              {requiredVars.map((varDef) => {
                if (!packagePolicyInputStream?.vars) return null;
                const { name: varName, type: varType } = varDef;
                const varConfigEntry = packagePolicyInputStream.vars?.[varName];
                const value = varConfigEntry?.value;
                const frozen = varConfigEntry?.frozen ?? false;
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
                      {packageInfo.type === 'input' && (
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
                              options={[
                                {
                                  id: 'logs',
                                  label: 'Logs',
                                },
                                {
                                  id: 'metrics',
                                  label: 'Metrics',
                                },
                                {
                                  id: 'traces',
                                  label: 'Traces',
                                },
                              ]}
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
                            />
                          </EuiFormRow>
                        </EuiFlexItem>
                      )}
                      {advancedVars.map((varDef) => {
                        if (!packagePolicyInputStream.vars) return null;
                        const { name: varName, type: varType } = varDef;
                        const value = packagePolicyInputStream.vars?.[varName]?.value;

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
