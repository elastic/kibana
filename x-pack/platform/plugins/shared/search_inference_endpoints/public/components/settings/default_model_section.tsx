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
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSwitch,
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
    {
      label: i18n.translate(
        'xpack.searchInferenceEndpoints.settings.globalModel.preconfiguredGroup',
        {
          defaultMessage: 'Pre-configured',
        }
      ),
      value: 'preconfigured',
      options: preconfigured,
    },
    {
      label: i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.customGroup', {
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
  if (value === NO_DEFAULT_MODEL) return [];
  const findInOptions = (
    option: EuiComboBoxOptionOption<string>
  ): EuiComboBoxOptionOption<string>[] => {
    if (!option.options && option.value === value) return [option];
    if (option.options) return option.options.flatMap(findInOptions);
    return [];
  };
  return options.flatMap(findInOptions);
};

const enabledLabel = () =>
  i18n.translate('xpack.searchInferenceEndpoints.settings.toggle.enabled', {
    defaultMessage: 'Enabled',
  });
const disabledLabel = () =>
  i18n.translate('xpack.searchInferenceEndpoints.settings.toggle.disabled', {
    defaultMessage: 'Disabled',
  });

export const DefaultModelSection: React.FC<Props> = ({ defaultModelSettings, validation }) => {
  const { state, setEnableAi, setDefaultModelId, setFeatureSpecificModels } = defaultModelSettings;
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();

  const options = useMemo(() => getOptions(connectors), [connectors]);
  const selectedOptions = useMemo(
    () => getSelectedOptions(state.defaultModelId, options),
    [state.defaultModelId, options]
  );

  const onChangeDefaultModel = (selected: EuiComboBoxOptionOption<string>[]) => {
    setDefaultModelId(selected[0]?.value ?? NO_DEFAULT_MODEL);
  };

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l" data-test-subj="defaultModelSection">
      <EuiDescribedFormGroup
        data-test-subj="aiCapabilitiesRow"
        fullWidth
        gutterSize="xl"
        title={
          <EuiTitle size="xs">
            <h3 data-test-subj="aiCapabilitiesTitle">
              {i18n.translate('xpack.searchInferenceEndpoints.settings.aiCapabilities.title', {
                defaultMessage: 'AI capabilities',
              })}
            </h3>
          </EuiTitle>
        }
        description={
          <p>
            {i18n.translate('xpack.searchInferenceEndpoints.settings.aiCapabilities.description', {
              defaultMessage: 'Enables AI capabilities in various features.',
            })}
          </p>
        }
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.searchInferenceEndpoints.settings.aiCapabilities.fieldLabel',
            {
              defaultMessage: 'Use AI features',
            }
          )}
        >
          <EuiSwitch
            data-test-subj="enableAiSwitch"
            label={state.enableAi ? enabledLabel() : disabledLabel()}
            checked={state.enableAi}
            onChange={(e) => setEnableAi(e.target.checked)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {state.enableAi && (
        <>
          <EuiHorizontalRule margin="l" />
          <EuiDescribedFormGroup
            data-test-subj="globalModelRow"
            fullWidth
            gutterSize="xl"
            title={
              <EuiTitle size="xs">
                <h3 data-test-subj="globalModelTitle">
                  {i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.title', {
                    defaultMessage: 'Global model',
                  })}
                </h3>
              </EuiTitle>
            }
            description={
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.description', {
                  defaultMessage:
                    'Choose a default model to use for AI features. Individual features can override this with their own model selection.',
                })}
              </p>
            }
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.globalModel.fieldLabel',
                {
                  defaultMessage: 'Global model',
                }
              )}
              isInvalid={validation.errors.length > 0}
              error={validation.errors as string[]}
            >
              <EuiComboBox
                data-test-subj="globalModelComboBox"
                placeholder={i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.globalModel.placeholder',
                  {
                    defaultMessage: 'Select a default model',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={selectedOptions}
                onChange={onChangeDefaultModel}
                isLoading={connectorsLoading}
                isInvalid={validation.errors.length > 0}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiHorizontalRule margin="l" />
          <EuiDescribedFormGroup
            data-test-subj="featureSpecificModelsRow"
            fullWidth
            gutterSize="xl"
            title={
              <EuiTitle size="xs">
                <h3 data-test-subj="featureSpecificModelsTitle">
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.settings.featureSpecificModels.title',
                    {
                      defaultMessage: 'Feature specific models',
                    }
                  )}
                </h3>
              </EuiTitle>
            }
            description={
              <p>
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.featureSpecificModels.description',
                  {
                    defaultMessage:
                      'Use the recommended models for features or customize per feature and choose your own set of models.',
                  }
                )}
              </p>
            }
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.featureSpecificModels.fieldLabel',
                {
                  defaultMessage: 'Feature specific models',
                }
              )}
            >
              <EuiSwitch
                data-test-subj="featureSpecificModelsSwitch"
                label={state.featureSpecificModels ? enabledLabel() : disabledLabel()}
                checked={state.featureSpecificModels}
                onChange={(e) => setFeatureSpecificModels(e.target.checked)}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </>
      )}
    </EuiPanel>
  );
};
