/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import type {
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicyInputStream,
  RegistryInput,
  RegistryStream,
  RegistryStreamWithDataStream,
  RegistryVarsEntry,
} from '../../../../../../types';
import type { PackagePolicyInputValidationResults } from '../../../services';
import { hasInvalidButRequiredVar, countValidationErrors } from '../../../services';
import { useAgentless } from '../../../single_page_layout/hooks/setup_technology';

import { PackagePolicyInputConfig } from './package_policy_input_config';
import { PackagePolicyInputStreamConfig } from './package_policy_input_stream';
import { useDataStreamId } from './hooks';

const ShortenedHorizontalRule = styled(EuiHorizontalRule)`
  &&& {
    width: ${(11 / 12) * 100}%;
    margin-left: auto;
  }
`;

export const shouldShowStreamsByDefault = (
  packageInput: RegistryInput,
  packageInputStreams: Array<RegistryStream & { data_stream: { dataset: string; type: string } }>,
  packagePolicyInput: NewPackagePolicyInput,
  defaultDataStreamId?: string
): boolean => {
  if (!packagePolicyInput.enabled) {
    return false;
  }

  return (
    hasInvalidButRequiredVar(packageInput.vars, packagePolicyInput.vars) ||
    packageInputStreams.some(
      (stream) =>
        stream.enabled &&
        hasInvalidButRequiredVar(
          stream.vars,
          packagePolicyInput.streams.find(
            (pkgStream) => stream.data_stream.dataset === pkgStream.data_stream.dataset
          )?.vars
        )
    ) ||
    packagePolicyInput.streams.some((stream) => {
      return defaultDataStreamId && stream.id && stream.id === defaultDataStreamId;
    })
  );
};

export const PackagePolicyInputPanel: React.FunctionComponent<{
  packageInput: RegistryInput;
  packageInfo: PackageInfo;
  packageInputStreams: RegistryStreamWithDataStream[];
  packagePolicyInput: NewPackagePolicyInput;
  updatePackagePolicyInput: (updatedInput: Partial<NewPackagePolicyInput>) => void;
  inputValidationResults: PackagePolicyInputValidationResults;
  forceShowErrors?: boolean;
  isEditPage?: boolean;
  varGroupSelections?: Record<string, string>;
}> = memo(
  ({
    packageInput,
    packageInfo,
    packageInputStreams,
    packagePolicyInput,
    updatePackagePolicyInput,
    inputValidationResults,
    forceShowErrors,
    isEditPage = false,
    varGroupSelections = {},
  }) => {
    const defaultDataStreamId = useDataStreamId();
    const { isAgentlessEnabled } = useAgentless();
    // Showing streams toggle state
    const [isShowingStreams, setIsShowingStreams] = useState<boolean>(() =>
      shouldShowStreamsByDefault(
        packageInput,
        packageInputStreams,
        packagePolicyInput,
        defaultDataStreamId
      )
    );

    // Hide registry variables based on `hide_in_deployment_modes` value
    const hideRegistryVars = useCallback(
      (registryVar: RegistryVarsEntry) => {
        if (!registryVar.hide_in_deployment_modes) return false;
        return (
          (isAgentlessEnabled &&
            !!registryVar.hide_in_deployment_modes?.find((mode) => mode === 'agentless')) ||
          (!isAgentlessEnabled &&
            !!registryVar.hide_in_deployment_modes?.find((mode) => mode === 'default'))
        );
      },
      [isAgentlessEnabled]
    );

    const packageInputStreamShouldBeVisible = useCallback(
      (packageInputStream: RegistryStreamWithDataStream) => {
        return (
          !!packageInputStream.vars &&
          packageInputStream.vars.length > 0 &&
          !!packageInputStream.vars.find(
            (registryVar: RegistryVarsEntry) => !hideRegistryVars(registryVar)
          )
        );
      },
      [hideRegistryVars]
    );

    // Errors state
    const errorCount = inputValidationResults && countValidationErrors(inputValidationResults);
    const hasErrors = forceShowErrors && errorCount;

    const hasInputStreams = useMemo(
      () => packageInputStreams.length > 0,
      [packageInputStreams.length]
    );

    const inputStreams = useMemo(
      () =>
        packageInputStreams
          .filter((packageInputStream) => packageInputStreamShouldBeVisible(packageInputStream))
          .map((packageInputStream) => {
            return {
              packageInputStream,
              packagePolicyInputStream: packagePolicyInput.streams.find(
                (stream) => stream.data_stream.dataset === packageInputStream.data_stream.dataset
              ),
            };
          })
          .filter((stream) => Boolean(stream.packagePolicyInputStream)),
      [packageInputStreamShouldBeVisible, packageInputStreams, packagePolicyInput.streams]
    );
    const showTopLevelDescription = inputStreams.length === 1;

    return (
      <>
        {/* Header / input-level toggle */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="PackagePolicy.InputStreamConfig.Switch"
              label={
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3 data-test-subj="PackagePolicy.InputStreamConfig.title">
                        {packageInput.title || packageInput.type}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={packagePolicyInput.enabled}
              disabled={packagePolicyInput.keep_enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                updatePackagePolicyInput({
                  enabled,
                  streams: packagePolicyInput.streams.map((stream) => ({
                    ...stream,
                    enabled,
                  })),
                });
                if (!enabled && isShowingStreams) {
                  setIsShowingStreams(false);
                }
              }}
            />
            <EuiSpacer size="s" />
            {/* show the description under the top level toggle if theres only one stream */}
            {showTopLevelDescription && (
              <EuiText size="s" color="subdued">
                <ReactMarkdown>
                  {String(inputStreams[0]?.packageInputStream?.description)}
                </ReactMarkdown>
              </EuiText>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {hasErrors ? (
                <EuiFlexItem grow={false}>
                  <EuiText color="danger" size="s">
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                      defaultMessage="{count, plural, one {# error} other {# errors}}"
                      values={{ count: errorCount }}
                    />
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color={hasErrors ? 'danger' : 'primary'}
                  onClick={() => setIsShowingStreams(!isShowingStreams)}
                  iconType={isShowingStreams ? 'arrowUp' : 'arrowDown'}
                  iconSide="right"
                  aria-expanded={isShowingStreams}
                  aria-label={i18n.translate(
                    'xpack.fleet.createPackagePolicy.stepConfigure.expandAriaLabel',
                    {
                      defaultMessage: 'Change default settings for {title}',
                      values: {
                        title: packageInput.title || packageInput.type,
                      },
                    }
                  )}
                >
                  {
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.expandLabel"
                      defaultMessage="Change defaults"
                    />
                  }
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Header rule break */}
        {isShowingStreams ? <EuiSpacer size="l" /> : null}
        {/* Input level policy */}
        {isShowingStreams && packageInput.vars && packageInput.vars.length ? (
          <Fragment>
            <PackagePolicyInputConfig
              data-test-subj="PackagePolicy.InputConfig"
              hasInputStreams={hasInputStreams}
              packageInputVars={packageInput.vars}
              packagePolicyInput={packagePolicyInput}
              updatePackagePolicyInput={updatePackagePolicyInput}
              inputValidationResults={inputValidationResults}
              forceShowErrors={forceShowErrors}
              isEditPage={isEditPage}
            />
            {hasInputStreams ? <ShortenedHorizontalRule margin="m" /> : <EuiSpacer size="l" />}
          </Fragment>
        ) : null}

        {/* Per-stream policy */}
        {isShowingStreams ? (
          <EuiFlexGroup direction="column" data-test-subj="PackagePolicy.InputConfig.streams">
            {inputStreams.map(({ packageInputStream, packagePolicyInputStream }, index) => (
              <EuiFlexItem key={index}>
                <PackagePolicyInputStreamConfig
                  data-test-subj="PackagePolicy.InputStreamConfig"
                  packageInfo={packageInfo}
                  packageInputStream={packageInputStream}
                  totalStreams={inputStreams.length}
                  packagePolicyInputStream={packagePolicyInputStream!}
                  updatePackagePolicyInputStream={(
                    updatedStream: Partial<PackagePolicyInputStream>
                  ) => {
                    const indexOfUpdatedStream = packagePolicyInput.streams.findIndex(
                      (stream) =>
                        stream.data_stream.dataset === packageInputStream.data_stream.dataset
                    );
                    const newStreams = [...packagePolicyInput.streams];
                    newStreams[indexOfUpdatedStream] = {
                      ...newStreams[indexOfUpdatedStream],
                      ...updatedStream,
                    };

                    const updatedInput: Partial<NewPackagePolicyInput> = {
                      streams: newStreams,
                    };

                    // Update input enabled state if needed
                    if (!packagePolicyInput.enabled && updatedStream.enabled) {
                      updatedInput.enabled = true;
                    } else if (
                      packagePolicyInput.enabled &&
                      !newStreams.find((stream) => stream.enabled)
                    ) {
                      updatedInput.enabled = false;
                    }

                    updatePackagePolicyInput(updatedInput);
                  }}
                  inputStreamValidationResults={
                    inputValidationResults?.streams?.[
                      packagePolicyInputStream!.data_stream!.dataset
                    ] ?? {}
                  }
                  forceShowErrors={forceShowErrors}
                  isEditPage={isEditPage}
                  varGroupSelections={varGroupSelections}
                />
                {index !== inputStreams.length - 1 ? (
                  <>
                    <EuiSpacer size="m" />
                    <ShortenedHorizontalRule margin="none" />
                  </>
                ) : null}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : null}
      </>
    );
  }
);
