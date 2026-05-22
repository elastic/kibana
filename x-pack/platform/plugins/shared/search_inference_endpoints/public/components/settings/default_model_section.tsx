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
import { useConnectorExists } from '../../hooks/use_connector_exists';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';

interface Props {
  defaultModelSettings: UseDefaultModelSettingsReturn;
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

export const DefaultModelSection: React.FC<Props> = ({ defaultModelSettings }) => {
  const { state, setDefaultModelId, setDisallowOtherModels } = defaultModelSettings;
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();
  const { exists: connectorExists, loading: connectorExistsLoading } = useConnectorExists(
    state.defaultModelId
  );
  const usageTracker = useUsageTracker();

  const options = useMemo(() => getOptions(connectors), [connectors]);
  const selectedOptions = useMemo(
    () => getSelectedOptions(state.defaultModelId, options),
    [state.defaultModelId, options]
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!connectorExists && !connectorExistsLoading && state.defaultModelId !== NO_DEFAULT_MODEL) {
      errors.push(
        i18n.translate(
          'xpack.searchInferenceEndpoints.settings.defaultModel.error.connectorNotExist',
          {
            defaultMessage:
              'The model previously selected is not available. Please select a different option.',
          }
        )
      );
    }
    if (state.disallowOtherModels && state.defaultModelId === NO_DEFAULT_MODEL) {
      errors.push(
        i18n.translate(
          'xpack.searchInferenceEndpoints.settings.defaultModel.error.disallowNoDefault',
          {
            defaultMessage: 'When disallowing all other models, a default model must be selected.',
          }
        )
      );
    }
    return errors;
  }, [connectorExists, connectorExistsLoading, state.defaultModelId, state.disallowOtherModels]);

  const onChangeDefaultModel = (selected: EuiComboBoxOptionOption<string>[]) => {
    const value = selected[0]?.value ?? NO_DEFAULT_MODEL;
    usageTracker.count(EventType.DEFAULT_MODEL_CHANGED);
    setDefaultModelId(value);
  };

  const onChangeDisallow = (checked: boolean) => {
    setDisallowOtherModels(checked);
  };

  return (
    <EuiSplitPanel.Outer grow hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiDescribedFormGroup
          data-test-subj="defaultModelSection"
          fullWidth
          gutterSize="xl"
          title={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3 data-test-subj="defaultModelTitle">
                    {i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.title', {
                      defaultMessage: 'Default model',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          description={
            <p>
              {i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.description', {
                defaultMessage:
                  'Choose a default model for all AI features. Individual features can override this with their own model.',
              })}
            </p>
          }
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.label', {
              defaultMessage: 'Default model',
            })}
            isInvalid={validationErrors.length > 0}
            error={validationErrors}
          >
            <EuiComboBox
              data-test-subj="defaultModelComboBox"
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
              isInvalid={validationErrors.length > 0}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        grow={false}
        color={state.disallowOtherModels ? 'danger' : 'subdued'}
        paddingSize="l"
      >
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
                  defaultMessage: 'Only allow the default model to be used.',
                }
              )}
              checked={state.disallowOtherModels}
              onChange={(e) => onChangeDisallow(e.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {state.disallowOtherModels
                ? i18n.translate(
                    'xpack.searchInferenceEndpoints.settings.defaultModel.disallowOtherModels.description',
                    {
                      defaultMessage:
                        'Model selection is hidden and only the default model will be used.',
                    }
                  )
                : i18n.translate(
                    'xpack.searchInferenceEndpoints.settings.defaultModel.allowOtherModels.description',
                    {
                      defaultMessage: 'Users can choose between multiple models for each feature.',
                    }
                  )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
