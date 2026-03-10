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
import { useFieldSettingsContext, type ValidationError } from '../../contexts/settings_context';
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

// Validation function for Default AI Connector settings
const validateDefaultAIConnector = (
  unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>,
  fields: Record<string, FieldDefinition<UiSettingsType>>,
  connectors: UseGenAiConnectorsResult
): ValidationError[] => {
  const defaultLlmValue = getDefaultLlmValue(unsavedChanges, fields);
  const defaultLlmOnlyValue = getDefaultLlmOnlyValue(unsavedChanges, fields);

  const errors: ValidationError[] = [];

  // Check if selected connector exists
  const selectedConnectorExists =
    connectors.connectors?.some((connector) => connector.id === defaultLlmValue) ||
    defaultLlmValue === NO_DEFAULT_CONNECTOR;

  if (!selectedConnectorExists && !connectors.loading) {
    errors.push({
      message: i18n.translate(
        'xpack.gen_ai_settings.settings.defaultLLm.select.error.selectedDefaultLlmDoesNotExist.message',
        {
          defaultMessage:
            'The connector previously selected does not exist anymore. Please select a different option.',
        }
      ),
      field: GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    });
  }

  // Check if "disallow all other connectors" is enabled but no default connector is selected
  if (defaultLlmOnlyValue && defaultLlmValue === NO_DEFAULT_CONNECTOR) {
    errors.push({
      message: i18n.translate(
        'xpack.gen_ai_settings.settings.defaultLLmOnly.error.connectorNotSelected.message',
        {
          defaultMessage:
            'When disallowing all other connectors, a default connector must be selected.',
        }
      ),
      field: GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    });
  }

  return errors;
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

  // Memoize field names to prevent recreation on every render
  const fieldNames = useMemo(
    () => [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY],
    []
  );

  // Use field-specific settings context
  const { handleFieldChange, fields, unsavedChanges, setValidationErrors } =
    useFieldSettingsContext(fieldNames);

  const { services } = useKibana();
  const { notifications, application } = services;

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  // Calculate and set validation errors automatically
  React.useEffect(() => {
    const errors = validateDefaultAIConnector(unsavedChanges, fields, connectors);
    setValidationErrors(errors);
  }, [unsavedChanges, fields, connectors, setValidationErrors]);

  // Get current validation errors for inline display
  const validationErrors = useMemo(
    () => validateDefaultAIConnector(unsavedChanges, fields, connectors),
    [unsavedChanges, fields, connectors]
  );

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

  const defaultLlmValue = getDefaultLlmValue(unsavedChanges, fields);

  const selectedOptions = useMemo(
    () => getOptionsByValues(defaultLlmValue, options),
    [defaultLlmValue, options]
  );

  const defaultLlmOnlyValue = getDefaultLlmOnlyValue(unsavedChanges, fields);

  // Get validation errors for display (still needed for inline validation)
  const defaultLlmErrors = validationErrors.map((error: ValidationError) => error.message);

  return (
    <>
      <EuiFormRow
        label={GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR}
        isInvalid={defaultLlmErrors.length > 0}
        error={defaultLlmErrors}
      >
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
          isLoading={connectors.loading}
          isDisabled={!canEditAdvancedSettings}
          isInvalid={
            (selectedOptions.length === 0 && !connectors.loading) ||
            (defaultLlmOnlyValue && selectedOptions[0]?.value === NO_DEFAULT_CONNECTOR)
          }
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="defaultAiConnectorCheckbox"
              data-test-subj="defaultAiConnectorCheckbox"
              label={
                <FormattedMessage
                  id="genAiSettings.gen_ai_settings.settings.defaultLlmOnly.checkbox.label"
                  defaultMessage="Disallow all other connectors"
                />
              }
              checked={defaultLlmOnlyValue}
              onChange={(e) => onChangeDefaultOnly(e.target.checked)}
              disabled={!canEditAdvancedSettings}
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
