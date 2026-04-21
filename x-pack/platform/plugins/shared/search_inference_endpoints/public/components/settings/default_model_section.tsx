/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import { useConnectors } from '../../hooks/use_connectors';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';
import type { DefaultModelValidationResult } from '../../hooks/use_default_model_validation';

interface Props {
  defaultModelSettings: UseDefaultModelSettingsReturn;
  validation: DefaultModelValidationResult;
}

const NoDefaultOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.noDefault', {
    defaultMessage: 'No default model',
  }),
  value: NO_DEFAULT_MODEL,
};

const getOptions = (connectors?: InferenceConnector[]): EuiComboBoxOptionOption<string>[] => {
  const preconfigured =
    connectors
      ?.filter((c) => c.isPreconfigured)
      .map((c) => ({ label: c.name, value: c.connectorId })) ?? [];

  const custom =
    connectors
      ?.filter((c) => !c.isPreconfigured)
      .map((c) => ({ label: c.name, value: c.connectorId })) ?? [];

  return [
    NoDefaultOption,
    {
      label: i18n.translate(
        'xpack.searchInferenceEndpoints.settings.defaultModel.preconfiguredGroup',
        {
          defaultMessage: 'Pre-configured',
        }
      ),
      value: 'preconfigured',
      options: preconfigured,
    },
    {
      label: i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.customGroup', {
        defaultMessage: 'Custom connectors',
      }),
      value: 'custom',
      options: custom,
    },
  ];
};

const getSelectedOptions = (
  value: string,
  options: EuiComboBoxOptionOption<string>[]
): EuiComboBoxOptionOption<string>[] => {
  const findInOptions = (
    option: EuiComboBoxOptionOption<string>
  ): EuiComboBoxOptionOption<string>[] => {
    if (!option.options && option.value === value) return [option];
    if (option.options) return option.options.flatMap(findInOptions);
    return [];
  };
  return options.flatMap(findInOptions);
};

export const DefaultModelSection: React.FC<Props> = ({ defaultModelSettings, validation }) => {
  const { state, setEnableAi, setDefaultModelId, setDisallowOtherModels } = defaultModelSettings;
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();

  const options = useMemo(() => getOptions(connectors), [connectors]);
  const selectedOptions = useMemo(
    () => getSelectedOptions(state.defaultModelId, options),
    [state.defaultModelId, options]
  );

  const onChangeDefaultModel = (selected: EuiComboBoxOptionOption<string>[]) => {
    // Picking the explicit "No default model" option OR clicking the combobox
    // clear button both collapse to NO_DEFAULT_MODEL, which keeps story 3
    // ("AI on, no default, customize per feature") reachable.
    setDefaultModelId(selected[0]?.value ?? NO_DEFAULT_MODEL);
  };

  return (
    <EuiSplitPanel.Outer grow hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiDescribedFormGroup
          data-test-subj="enableAiSection"
          fullWidth
          gutterSize="xl"
          title={
            <EuiTitle size="xs">
              <h3 data-test-subj="enableAiTitle">
                {i18n.translate('xpack.searchInferenceEndpoints.settings.enableAi.title', {
                  defaultMessage: 'Enable AI features',
                })}
              </h3>
            </EuiTitle>
          }
          description={
            <p>
              {i18n.translate('xpack.searchInferenceEndpoints.settings.enableAi.description', {
                defaultMessage:
                  'Turn on AI capabilities in Kibana. When enabled, configure a default model and per-feature options below.',
              })}
            </p>
          }
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.searchInferenceEndpoints.settings.enableAi.label', {
              defaultMessage: 'AI features',
            })}
          >
            <EuiSwitch
              data-test-subj="enableAiSwitch"
              label={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.enableAi.switchLabel',
                {
                  defaultMessage: 'Use AI features',
                }
              )}
              checked={state.enableAi}
              onChange={(e) => setEnableAi(e.target.checked)}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiHorizontalRule margin="l" />
        <EuiDescribedFormGroup
          data-test-subj="defaultModelSection"
          fullWidth
          gutterSize="xl"
          title={
            <EuiTitle size="xs">
              <h3 data-test-subj="defaultModelTitle">
                {i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.title', {
                  defaultMessage: 'Default model',
                })}
              </h3>
            </EuiTitle>
          }
          description={
            <p>
              {i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.description', {
                defaultMessage:
                  'Choose a default inference model for all AI features. Individual features can override this with their own model below.',
              })}
            </p>
          }
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.label', {
              defaultMessage: 'Default model',
            })}
            isInvalid={state.enableAi && validation.errors.length > 0}
            error={state.enableAi ? validation.errors : undefined}
          >
            <EuiComboBox
              data-test-subj="defaultModelComboBox"
              isDisabled={!state.enableAi}
              placeholder={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.defaultModel.placeholder',
                {
                  defaultMessage: 'Select a default model',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={selectedOptions}
              onChange={onChangeDefaultModel}
              isLoading={connectorsLoading}
              isInvalid={state.enableAi && validation.errors.length > 0}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiSplitPanel.Inner>

      {state.enableAi && (
        <EuiSplitPanel.Inner grow={false} color="subdued" paddingSize="l">
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiSwitch
                id="disallowOtherModelsCheckbox"
                data-test-subj="disallowOtherModelsCheckbox"
                label={i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.defaultModel.disallowOtherModels',
                  {
                    defaultMessage: 'Hide model selection within features.',
                  }
                )}
                checked={state.disallowOtherModels}
                onChange={(e) => setDisallowOtherModels(e.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {state.disallowOtherModels
                  ? i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.defaultModel.disallowOtherModels.description',
                      {
                        defaultMessage: 'Features will only use the default model.',
                      }
                    )
                  : i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.defaultModel.allowOtherModels.description',
                      {
                        defaultMessage:
                          'Features can allow multiple models to be chosen from their UI.',
                      }
                    )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};
