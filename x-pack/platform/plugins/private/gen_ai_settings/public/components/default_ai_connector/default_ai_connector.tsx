/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type { FieldDefinition, UnsavedFieldChange } from '@kbn/management-settings-types';
import type { UiSettingsType } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { UseGenAiConnectorsResult } from '../../hooks/use_genai_connectors';
import { useSettingsContext } from '../../contexts/settings_context';
import { NO_DEFAULT_CONNECTOR } from '../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  connectors: UseGenAiConnectorsResult;
}

const NoDefaultOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate(
    'xpack.gen_ai_settings.settings.defaultLLm.select.option.noDefaultConnector',
    { defaultMessage: 'No default connector' }
  ),
  value: NO_DEFAULT_CONNECTOR,
};

const getOptions = (connectors: UseGenAiConnectorsResult): EuiComboBoxOptionOption<string>[] => {
  const preconfigured =
    connectors.connectors
      ?.filter((connector) => connector.isPreconfigured)
      .map((connector) => ({
        label: connector.name,
        value: connector.id,
      })) ?? [];

  const custom =
    connectors.connectors
      ?.filter((connector) => !connector.isPreconfigured)
      .map((connector) => ({
        label: connector.name,
        value: connector.id,
      })) ?? [];

  return [
    NoDefaultOption,
    {
      label: i18n.translate(
        'xpack.gen_ai_settings.settings.defaultLLm.select.group.preconfigured.label',
        { defaultMessage: 'Pre-configured' }
      ),
      value: 'preconfigured',
      options: preconfigured,
    },
    {
      label: i18n.translate('xpack.gen_ai_settings.settings.defaultLLm.select.group.custom.label', {
        defaultMessage: 'Custom connectors',
      }),
      value: 'custom',
      options: custom,
    },
  ];
};

const getOptionsByValues = (
  value: string,
  options: EuiComboBoxOptionOption<string>[]
): EuiComboBoxOptionOption<string>[] => {
  const getOptionsByValuesHelper = (
    option: EuiComboBoxOptionOption<string>
  ): EuiComboBoxOptionOption<string>[] => {
    if (option.options === undefined && option.value === value) {
      // If the option has no sub-options and its value is in the selected values, include it
      return [option];
    }
    if (option.options) {
      // If the option has sub-options, recursively get their options
      return option.options.flatMap(getOptionsByValuesHelper);
    }
    return [];
  };

  return options.flatMap(getOptionsByValuesHelper);
};

export const DefaultAIConnector: React.FC<Props> = ({ connectors }) => {
  const options = useMemo(() => getOptions(connectors), [connectors]);
  const { handleFieldChange, fields, unsavedChanges } = useSettingsContext();
  const { services } = useKibana();
  const { notifications } = services;

  const onChangeDefaultLlm = (selectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const values = selectedOptions.map((option) => option.value);
    if (values.length > 1) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.observabilityAiAssistantManagement.defaultLlm.onChange.error.multipleSelected.title',
          {
            defaultMessage: 'An error occurred while changing the setting',
          }
        ),
        text: i18n.translate(
          'xpack.observabilityAiAssistantManagement.defaultLlm.onChange.error.multipleSelected.text',
          {
            defaultMessage: 'Only one default AI connector can be selected',
          }
        ),
      });
      throw new Error('Only one default AI connector can be selected');
    }
    const value = values[0] ?? NO_DEFAULT_CONNECTOR;

    if (value === fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]?.savedValue) {
      handleFieldChange(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
      return;
    }

    handleFieldChange(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, {
      type: 'string',
      unsavedValue: value,
    });
  };

  const onChangeDefaultOnly = (checked: boolean) => {
    if (checked === fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]?.savedValue) {
      handleFieldChange(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY);
      return;
    }

    handleFieldChange(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY, {
      type: 'boolean',
      unsavedValue: checked,
    });
  };

  const defaultLlmValues = getDefaultLlmValue(unsavedChanges, fields);

  const selectedOptions = useMemo(
    () => getOptionsByValues(defaultLlmValues, options),
    [defaultLlmValues, options]
  );

  const defaultLlmOnlyValue = getDefaultLlmOnlyValue(unsavedChanges, fields);

  return (
    <>
      <EuiFormRow label={GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR}>
        <EuiComboBox
          data-test-subj="defaultAiConnectorComboBox"
          placeholder={i18n.translate(
            'xpack.gen_ai_settings.settings.defaultLLm.select.placeholder',
            { defaultMessage: 'Select a single option' }
          )}
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onChangeDefaultLlm}
          isDisabled={fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]?.isReadOnly}
          isLoading={connectors.loading}
          isInvalid={selectedOptions.length === 0 && !connectors.loading}
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="defaultAiConnectorCheckbox"
              data-test-subj="defaultAiConnectorCheckbox"
              disabled={fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]?.isReadOnly}
              label={
                <FormattedMessage
                  id="genAiSettings.gen_ai_settings.settings.defaultLlmOnly.checkbox.label"
                  defaultMessage="Disallow all other connectors"
                />
              }
              checked={defaultLlmOnlyValue}
              onChange={(e) => onChangeDefaultOnly(e.target.checked)}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.gen_ai_settings.settings.defaultLLmOnly.checkbox.tooltip',
                {
                  defaultMessage:
                    'Only the chosen default connector will be shown to users of this space.',
                }
              )}
              position="top"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};

/**
 * Gets current value for the default LLM connector. First checks for unsaved changes, then saved, then default.
 */
function getDefaultLlmValue(
  unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>,
  fields: Record<string, FieldDefinition<UiSettingsType>>
) {
  const defaultLlmUnsavedValue = unsavedChanges[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]
    ?.unsavedValue as string | undefined;
  const defaultLlmSavedValue = fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]?.savedValue as
    | string
    | undefined;
  const defaultLlmDefaultValue = fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]?.defaultValue as
    | string
    | undefined;

  const defaultLlmValue =
    defaultLlmUnsavedValue ??
    defaultLlmSavedValue ??
    defaultLlmDefaultValue ??
    NO_DEFAULT_CONNECTOR;
  return defaultLlmValue;
}

/**
 * Gets current value for the default LLM only setting. First checks for unsaved changes, then saved, then default.
 */
function getDefaultLlmOnlyValue(
  unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>,
  fields: Record<string, FieldDefinition<UiSettingsType>>
): boolean {
  const defaultLlmOnlyUnsavedValue = unsavedChanges[
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY
  ]?.unsavedValue as boolean | undefined;
  const defaultLlmOnlySavedValue = fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]
    ?.savedValue as boolean | undefined;
  const defaultLlmOnlyDefaultValue = fields[GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]
    ?.defaultValue as boolean | undefined;

  const defaultLlmOnlyValue =
    defaultLlmOnlyUnsavedValue ?? defaultLlmOnlySavedValue ?? defaultLlmOnlyDefaultValue ?? false;
  return defaultLlmOnlyValue;
}
