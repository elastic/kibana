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
import type { InferenceConnector } from '@kbn/inference-common';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import * as i18n from '../../../common/translations';
import { useConnectors } from '../../hooks/use_connectors';
import { useConnectorExists } from '../../hooks/use_connector_exists';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';

interface Props {
  defaultModelSettings: UseDefaultModelSettingsReturn;
}

const NoDefaultOption: EuiComboBoxOptionOption<string> = {
  label: i18n.DEFAULT_MODEL_NO_DEFAULT_OPTION,
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
      label: i18n.DEFAULT_MODEL_PRECONFIGURED_GROUP,
      value: 'preconfigured',
      options: preconfigured,
    },
    {
      label: i18n.DEFAULT_MODEL_CUSTOM_GROUP,
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

  const options = useMemo(() => getOptions(connectors), [connectors]);
  const selectedOptions = useMemo(
    () => getSelectedOptions(state.defaultModelId, options),
    [state.defaultModelId, options]
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!connectorExists && !connectorExistsLoading && state.defaultModelId !== NO_DEFAULT_MODEL) {
      errors.push(i18n.DEFAULT_MODEL_CONNECTOR_NOT_EXIST_ERROR);
    }
    if (state.disallowOtherModels && state.defaultModelId === NO_DEFAULT_MODEL) {
      errors.push(i18n.DEFAULT_MODEL_DISALLOW_NO_DEFAULT_ERROR);
    }
    return errors;
  }, [connectorExists, connectorExistsLoading, state.defaultModelId, state.disallowOtherModels]);

  const onChangeDefaultModel = (selected: EuiComboBoxOptionOption<string>[]) => {
    const value = selected[0]?.value ?? NO_DEFAULT_MODEL;
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
                  <h3 data-test-subj="defaultModelTitle">{i18n.DEFAULT_MODEL_TITLE}</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          description={<p>{i18n.DEFAULT_MODEL_DESCRIPTION}</p>}
        >
          <EuiFormRow
            fullWidth
            label={i18n.DEFAULT_MODEL_LABEL}
            isInvalid={validationErrors.length > 0}
            error={validationErrors}
          >
            <EuiComboBox
              data-test-subj="defaultModelComboBox"
              placeholder={i18n.DEFAULT_MODEL_PLACEHOLDER}
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
              label={i18n.DISALLOW_OTHER_MODELS_LABEL}
              checked={state.disallowOtherModels}
              onChange={(e) => onChangeDisallow(e.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {state.disallowOtherModels
                ? i18n.DISALLOW_OTHER_MODELS_DESCRIPTION
                : i18n.ALLOW_OTHER_MODELS_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
