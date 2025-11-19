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
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type {
  FieldDefinition,
  OnFieldChangeFn,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import type { UiSettingsType } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_CONNECTOR } from '../lib/constants';
import { useDefaultAiConnectorSettingContext } from '../context/default_ai_connector_context';

interface ConnectorData {
  connectors?: Array<{
    id: string;
    name: string;
    isPreconfigured: boolean;
    actionTypeId: string;
    config?: Record<string, any>;
  }>;
  loading: boolean;
}

const hasElasticManagedLlm = (connectors: ConnectorData['connectors'] | undefined) => {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return false;
  }

  return connectors.find(
    (connector) =>
      connector.actionTypeId === '.inference' &&
      connector.isPreconfigured &&
      connector.config?.provider === 'elastic'
  );
};

interface Props {
  settings: {
    unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>;
    handleFieldChange: OnFieldChangeFn;
    fields: Record<
      string,
      FieldDefinition<
        UiSettingsType,
        string | number | boolean | (string | number)[] | null | undefined
      >
    >;
  };
  connectors: ConnectorData;
}

const NoDefaultOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate(
    'xpack.gen_ai_settings.settings.defaultLLm.select.option.noDefaultConnector',
    { defaultMessage: 'No default connector' }
  ),
  value: NO_DEFAULT_CONNECTOR,
};

const getOptions = (connectors: ConnectorData): EuiComboBoxOptionOption<string>[] => {
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

export const DefaultAIConnector: React.FC<Props> = ({ connectors, settings }) => {
  const { toast, application, docLinks, featureFlags } = useDefaultAiConnectorSettingContext();
  const options = useMemo(() => getOptions(connectors), [connectors]);
  const { handleFieldChange, fields, unsavedChanges } = settings;

  const onChangeDefaultLlm = (selectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const values = selectedOptions.map((option) => option.value);
    if (values.length > 1) {
      toast?.addDanger({
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

  const elasticManagedLlmExists = hasElasticManagedLlm(connectors.connectors);

  const connectorDescription = useMemo(() => {
    if (!elasticManagedLlmExists) {
      return (
        <p>
          <FormattedMessage
            id="genAiSettings.aiConnectorDescription"
            defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. In order to use the AI Assistant you must have a Generative AI connector. {manageConnectors}`}
            values={{
              manageConnectors: (
                <EuiLink
                  href={application.getUrlForApp('management', {
                    path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
                  })}
                  target="_blank"
                >
                  <FormattedMessage
                    id="genAiSettings.manage.connectors"
                    defaultMessage={'View connectors'}
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      );
    }

    return (
      <p>
        <FormattedMessage
          id="genAiSettings.aiConnectorDescriptionWithLink"
          defaultMessage={`A large language model (LLM) is required to power the AI Assistant and AI-powered features. By default, Elastic uses its {elasticManagedLlm} connector ({link}) when no custom connectors are available. When available, Elastic uses the last used custom connector. {manageConnectors}`}
          values={{
            link: (
              <EuiLink
                href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                target="_blank"
              >
                <FormattedMessage
                  id="genAiSettings.additionalCostsLink"
                  defaultMessage="additional costs incur"
                />
              </EuiLink>
            ),
            manageConnectors: (
              <EuiLink
                href={application.getUrlForApp('management', {
                  path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
                })}
                target="_blank"
              >
                <FormattedMessage
                  id="genAiSettings.manage.connectors"
                  defaultMessage="Manage connectors"
                />
              </EuiLink>
            ),
            elasticManagedLlm: (
              <strong>
                <FormattedMessage
                  id="genAiSettings.elasticManagedLlm"
                  defaultMessage="Elastic Managed LLM"
                />
              </strong>
            ),
          }}
        />
      </p>
    );
  }, [elasticManagedLlmExists, application, docLinks]);

  return (
    <>
      <EuiDescribedFormGroup
        data-test-subj="connectorsSection"
        fullWidth
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3 data-test-subj="connectorsTitle">
                  <FormattedMessage
                    id="genAiSettings.aiConnectorLabel"
                    defaultMessage="Default AI Connector"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={connectorDescription}
      >
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
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
                  isLoading={connectors.loading}
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
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
