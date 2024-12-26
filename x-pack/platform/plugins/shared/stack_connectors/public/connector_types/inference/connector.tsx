/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiInputPopover,
  EuiFieldText,
  EuiFieldTextProps,
  EuiSelectableOption,
  EuiFormControlLayout,
  keys,
  EuiHorizontalRule,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ConnectorFormSchema,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ConfigEntryView } from '../../../common/dynamic_config/types';
import { ServiceProviderKeys } from '../../../common/inference/constants';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE } from './constants';
import { SelectableProvider } from './providers/selectable';
import { Config, Secrets } from './types';
import { generateInferenceEndpointId, getTaskTypeOptions, TaskTypeOption } from './helpers';
import { useProviders } from './providers/get_providers';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import { AdditionalOptionsConnectorFields } from './additional_options_fields';
import { getProviderConfigHiddenField, getProviderSecretsHiddenField } from './hidden_fields';

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { updateFieldValues, setFieldValue, validateFields, isSubmitting } = useFormContext();
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.inferenceId',
      'config.provider',
      'config.providerConfig',
    ],
  });

  const { data: providers, isLoading } = useProviders(http, toasts);

  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);

  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [optionalProviderFormFields, setOptionalProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [requiredProviderFormFields, setRequiredProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );

  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [taskTypeFormFields] = useState<ConfigEntryView[]>([]);

  const handleProviderClosePopover = useCallback(() => {
    setProviderPopoverOpen(false);
  }, []);

  const handleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleProviderKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event: any) => {
    if (event.key === keys.ENTER) {
      setProviderPopoverOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isEdit && config && !config.inferenceId) {
      generateInferenceEndpointId(config, setFieldValue);
    }
  }, [isEdit, setFieldValue, config]);

  useEffect(() => {
    if (isSubmitting) {
      validateFields(['config.providerConfig']);
      validateFields(['secrets.providerSecrets']);
    }
  }, [isSubmitting, config, validateFields]);

  const onTaskTypeOptionsSelect = useCallback(
    (taskType: string) => {
      // Get task type settings
      setSelectedTaskType(taskType);

      updateFieldValues({
        config: {
          taskType,
        },
      });
      generateInferenceEndpointId({ ...config, taskType }, setFieldValue);
    },
    [config, setFieldValue, updateFieldValues]
  );

  const onProviderChange = useCallback(
    (provider?: string) => {
      const newProvider = providers?.find((p) => p.service === provider);

      // Update task types list available for the selected provider
      setTaskTypeOptions(getTaskTypeOptions(newProvider?.task_types ?? []));
      if (newProvider?.task_types && newProvider?.task_types.length > 0) {
        onTaskTypeOptionsSelect(newProvider?.task_types[0]);
      }

      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configurations ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configurations[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);

      const defaultProviderConfig: Record<string, unknown> = {};
      const defaultProviderSecrets: Record<string, unknown> = {};

      Object.keys(newProvider?.configurations ?? {}).forEach((k) => {
        if (!newProvider?.configurations[k].sensitive) {
          if (newProvider?.configurations[k] && !!newProvider?.configurations[k].default_value) {
            defaultProviderConfig[k] = newProvider.configurations[k].default_value;
          } else {
            defaultProviderConfig[k] = null;
          }
        } else {
          defaultProviderSecrets[k] = null;
        }
      });

      updateFieldValues({
        config: {
          provider: newProvider?.service,
          providerConfig: defaultProviderConfig,
        },
        secrets: {
          providerSecrets: defaultProviderSecrets,
        },
      });
    },
    [onTaskTypeOptionsSelect, providers, updateFieldValues]
  );

  useEffect(() => {
    if (config?.provider && isEdit) {
      const newProvider = providers?.find((p) => p.service === config.provider);
      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configurations ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configurations[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);
    }
  }, [config?.provider, config?.taskType, http, isEdit, providers]);

  useEffect(() => {
    // Set values from the provider secrets and config to the schema
    const existingConfiguration = providerSchema
      ? providerSchema.map((item: ConfigEntryView) => {
          const itemValue = item;
          itemValue.isValid = true;
          if (item.sensitive && secrets?.providerSecrets) {
            itemValue.value = secrets?.providerSecrets[item.key] as any;
          } else if (config?.providerConfig) {
            itemValue.value = config?.providerConfig[item.key] as any;
          }
          return itemValue;
        })
      : [];

    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required && !p.sensitive));
    setRequiredProviderFormFields(existingConfiguration.filter((p) => p.required || p.sensitive));
  }, [config?.providerConfig, providerSchema, secrets]);

  const getProviderOptions = useCallback(() => {
    return providers?.map((p) => ({
      label: p.service,
      key: p.service,
    })) as EuiSelectableOption[];
  }, [providers]);

  const onSetProviderConfigEntry = useCallback(
    async (key: string, value: unknown) => {
      const entry: ConfigEntryView | undefined = providerSchema.find(
        (p: ConfigEntryView) => p.key === key
      );
      if (entry) {
        if (entry.sensitive) {
          if (!secrets.providerSecrets) {
            secrets.providerSecrets = {};
          }
          const newSecrets = { ...secrets.providerSecrets };
          newSecrets[key] = value;
          setFieldValue('secrets.providerSecrets', newSecrets);
          await validateFields(['secrets.providerSecrets']);
        } else {
          if (!config.providerConfig) {
            config.providerConfig = {};
          }
          const newConfig = { ...config.providerConfig };
          newConfig[key] = value;
          setFieldValue('config.providerConfig', newConfig);
          await validateFields(['config.providerConfig']);
        }
      }
    },
    [config, providerSchema, secrets, setFieldValue, validateFields]
  );

  const onClearProvider = useCallback(() => {
    onProviderChange();
    setFieldValue('config.taskType', '');
    setFieldValue('config.provider', '');
  }, [onProviderChange, setFieldValue]);

  const providerIcon = useMemo(
    () =>
      Object.keys(SERVICE_PROVIDERS).includes(config?.provider)
        ? SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].icon
        : undefined,
    [config?.provider]
  );

  const providerName = useMemo(
    () =>
      Object.keys(SERVICE_PROVIDERS).includes(config?.provider)
        ? SERVICE_PROVIDERS[config?.provider as ServiceProviderKeys].name
        : config?.provider,
    [config?.provider]
  );

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        clear={isEdit || readOnly ? undefined : { onClick: onClearProvider }}
        isDropdown
        isDisabled={isEdit || readOnly}
        isInvalid={isInvalid}
        fullWidth
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : providerIcon}
      >
        <EuiFieldText
          onClick={handleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
          disabled={isEdit || readOnly}
          onKeyDown={handleProviderKeyboardOpen}
          value={config?.provider ? providerName : ''}
          fullWidth
          placeholder={i18n.SELECT_PROVIDER}
          icon={{ type: 'arrowDown', side: 'right' }}
          aria-expanded={isProviderPopoverOpen}
          role="combobox"
        />
      </EuiFormControlLayout>
    ),
    [
      isEdit,
      readOnly,
      onClearProvider,
      config?.provider,
      providerIcon,
      handleProviderPopover,
      handleProviderKeyboardOpen,
      providerName,
      isProviderPopoverOpen,
    ]
  );

  return (
    <>
      <UseField
        path="config.provider"
        config={{
          validations: [
            {
              validator: fieldValidators.emptyField(i18n.PROVIDER_REQUIRED),
              isBlocking: true,
            },
          ],
        }}
      >
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
          const selectInput = providerSuperSelect(isInvalid);
          return (
            <EuiFormRow
              id="providerSelectBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.stackConnectors.components.inference.providerLabel"
                  defaultMessage="Service"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
            >
              <EuiInputPopover
                id={'popoverId'}
                fullWidth
                input={selectInput}
                isOpen={isProviderPopoverOpen}
                closePopover={handleProviderClosePopover}
                className="rightArrowIcon"
              >
                <SelectableProvider
                  isLoading={isLoading}
                  getSelectableOptions={getProviderOptions}
                  onClosePopover={handleProviderClosePopover}
                  onProviderChange={onProviderChange}
                />
              </EuiInputPopover>
            </EuiFormRow>
          );
        }}
      </UseField>
      {config?.provider ? (
        <>
          <EuiSpacer size="m" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            direction="column"
            items={requiredProviderFormFields}
            setConfigEntry={onSetProviderConfigEntry}
          />
          <EuiSpacer size="m" />
          <AdditionalOptionsConnectorFields
            config={config}
            readOnly={readOnly}
            isEdit={isEdit}
            optionalProviderFormFields={optionalProviderFormFields}
            onSetProviderConfigEntry={onSetProviderConfigEntry}
            onTaskTypeOptionsSelect={onTaskTypeOptionsSelect}
            taskTypeFormFields={taskTypeFormFields}
            taskTypeOptions={taskTypeOptions}
            selectedTaskType={selectedTaskType}
          />
          <EuiSpacer size="l" />
          <EuiHorizontalRule />
          {getProviderSecretsHiddenField(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting
          )}
          {getProviderConfigHiddenField(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting
          )}
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
