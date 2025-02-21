/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiRadioGroupOption, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from './translations';

interface EndpointSelectionProps {
  allPaths: string[];
  pathSuggestions: string[];
  selectedPath: string | undefined;
  selectedOtherPath: string | undefined;
  useOtherEndpoint: boolean;
  isGenerating: boolean;
  showValidation: boolean;
  onChangeSuggestedPath(id: string): void;
  onChangeOtherPath(path: EuiComboBoxOptionOption[]): void;
}

export const EndpointSelection = React.memo<EndpointSelectionProps>(
  ({
    allPaths,
    pathSuggestions,
    selectedPath,
    selectedOtherPath,
    useOtherEndpoint,
    isGenerating,
    showValidation,
    onChangeSuggestedPath,
    onChangeOtherPath,
  }) => {
    const otherPathOptions = allPaths.map<EuiComboBoxOptionOption>((p) => ({ label: p }));

    const hasSuggestedPaths = pathSuggestions.length > 0;
    const isShowingAllPaths = pathSuggestions.length === allPaths.length;

    const options = (
      isShowingAllPaths ? pathSuggestions : pathSuggestions.concat([i18n.ENTER_MANUALLY])
    ).map<EuiRadioGroupOption>((option, index) =>
      // The LLM returns the path in preference order, so we know the first option is the recommended one
      index === 0
        ? {
            id: option,
            label: (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="s">{option}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge>{i18n.RECOMMENDED}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          }
        : { id: option, label: option }
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="confirmPath">
        <EuiTitle size="xs">
          <h4>{i18n.CONFIRM_ENDPOINT}</h4>
        </EuiTitle>
        {hasSuggestedPaths && (
          <EuiFlexItem>
            <EuiText size="s">{i18n.CONFIRM_ENDPOINT_DESCRIPTION}</EuiText>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiRadioGroup
                options={options}
                idSelected={selectedPath}
                disabled={isGenerating}
                onChange={onChangeSuggestedPath}
                data-test-subj="suggestedPathsRadioGroup"
              />
            </EuiFlexItem>
          </EuiFlexItem>
        )}
        {(!hasSuggestedPaths || (useOtherEndpoint && !isShowingAllPaths)) && (
          <EuiFlexGroup direction="column">
            <EuiFormRow
              fullWidth
              isDisabled={isGenerating}
              isInvalid={showValidation && useOtherEndpoint && selectedOtherPath === undefined}
              error={i18n.PATH_REQUIRED}
            >
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                fullWidth
                options={otherPathOptions}
                isDisabled={isGenerating}
                aria-invalid={showValidation && useOtherEndpoint && selectedOtherPath === undefined}
                isInvalid={showValidation && useOtherEndpoint && selectedOtherPath === undefined}
                selectedOptions={
                  selectedOtherPath === undefined ? undefined : [{ label: selectedOtherPath }]
                }
                onChange={onChangeOtherPath}
                data-test-subj="allPathOptionsComboBox"
              />
            </EuiFormRow>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    );
  }
);
EndpointSelection.displayName = 'EndpointSelection';
