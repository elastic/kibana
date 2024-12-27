/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  EuiFieldText,
  EuiFieldTextProps,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHorizontalRule,
  EuiInputPopover,
  EuiSpacer,
  keys,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';

import * as LABELS from '../translations';
import { Config, ConfigEntryView, FieldType, InferenceProvider, Secrets } from '../types/types';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import { DEFAULT_TASK_TYPE, ServiceProviderKeys } from '../constants';
import { SelectableProvider } from './providers/selectable';
import { TaskTypeOption, generateInferenceEndpointId, getTaskTypeOptions } from '../utils/helpers';
import { ConfigurationFormItems } from './configuration/configuration_form_items';
import { AdditionalOptionsFields } from './additional_options_fields';
import { ProviderSecretHiddenField } from './hidden_fields/provider_secret_hidden_field';
import { ProviderConfigHiddenField } from './hidden_fields/provider_config_hidden_field';

interface InferenceServicesProps {
  providers: InferenceProvider[];
}

export const InferenceServiceFormFields: React.FC<InferenceServicesProps> = ({ providers }) => {
  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);
  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);

  const { updateFieldValues, setFieldValue, validateFields, isSubmitting } = useFormContext();
  const [requiredProviderFormFields, setRequiredProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [optionalProviderFormFields, setOptionalProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.inferenceId',
      'config.provider',
      'config.providerConfig',
    ],
  });

  const toggleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closeProviderPopover = useCallback(() => {
    setProviderPopoverOpen(false);
  }, []);

  const handleProviderKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event: any) => {
    if (event.key === keys.ENTER) {
      setProviderPopoverOpen(true);
    }
  }, []);

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

  const onTaskTypeOptionsSelect = useCallback(
    (taskType: string) => {
      setSelectedTaskType(taskType);

      const inferenceId = generateInferenceEndpointId({
        ...config,
        taskType,
      });

      updateFieldValues({
        config: {
          taskType,
          inferenceId,
        },
      });
    },
    [config, updateFieldValues]
  );

  const onProviderChange = useCallback(
    (provider?: string) => {
      const newProvider = providers?.find((p) => p.service === provider);

      setTaskTypeOptions(getTaskTypeOptions(newProvider?.task_types ?? []));
      if (newProvider?.task_types && newProvider?.task_types.length > 0) {
        onTaskTypeOptionsSelect(newProvider?.task_types[0]);
      }

      const newProviderSchema: ConfigEntryView[] = Object.keys(
        newProvider?.configurations ?? {}
      ).map(
        (k): ConfigEntryView => ({
          key: k,
          isValid: true,
          validationErrors: [],
          value: newProvider?.configurations[k].default_value ?? null,
          default_value: newProvider?.configurations[k].default_value ?? null,
          description: newProvider?.configurations[k].description ?? null,
          label: newProvider?.configurations[k].label ?? '',
          required: newProvider?.configurations[k].required ?? false,
          sensitive: newProvider?.configurations[k].sensitive ?? false,
          updatable: newProvider?.configurations[k].updatable ?? false,
          type: newProvider?.configurations[k].type ?? FieldType.STRING,
        })
      );

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
      const inferenceId = generateInferenceEndpointId({
        ...config,
        provider: newProvider?.service ?? '',
        taskType: newProvider?.task_types[0] ?? DEFAULT_TASK_TYPE,
      });

      updateFieldValues({
        config: {
          provider: newProvider?.service,
          providerConfig: defaultProviderConfig,
          inferenceId,
        },
        secrets: {
          providerSecrets: defaultProviderSecrets,
        },
      });
    },
    [config, onTaskTypeOptionsSelect, providers, updateFieldValues]
  );

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

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        clear={{ onClick: onClearProvider }}
        isDropdown
        isInvalid={isInvalid}
        fullWidth
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : providerIcon}
      >
        <EuiFieldText
          onClick={toggleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
          onKeyDown={handleProviderKeyboardOpen}
          value={config?.provider ? providerName : ''}
          fullWidth
          placeholder={LABELS.SELECT_PROVIDER}
          icon={{ type: 'arrowDown', side: 'right' }}
          aria-expanded={isProviderPopoverOpen}
          role="combobox"
          onChange={() => {
            /* Intentionally left blank as onChange is required to avoid console error
               but not used in this context
            */
          }}
        />
      </EuiFormControlLayout>
    ),
    [
      config?.provider,
      handleProviderKeyboardOpen,
      toggleProviderPopover,
      isProviderPopoverOpen,
      onClearProvider,
      providerIcon,
      providerName,
    ]
  );

  useEffect(() => {
    if (isSubmitting) {
      validateFields(['config.providerConfig']);
      validateFields(['secrets.providerSecrets']);
    }
  }, [isSubmitting, config, validateFields]);

  useEffect(() => {
    // Set values from the provider secrets and config to the schema
    const existingConfiguration = providerSchema
      ? providerSchema.map((item: ConfigEntryView) => {
          const itemValue: ConfigEntryView = item;
          itemValue.isValid = true;
          if (item.sensitive && secrets?.providerSecrets) {
            const secretValue = secrets.providerSecrets[item.key];
            if (
              typeof secretValue === 'string' ||
              typeof secretValue === 'number' ||
              typeof secretValue === 'boolean' ||
              secretValue === null
            ) {
              itemValue.value = secretValue;
            }
          } else if (config?.providerConfig) {
            const configValue = config.providerConfig[item.key];
            if (
              typeof configValue === 'string' ||
              typeof configValue === 'number' ||
              typeof configValue === 'boolean' ||
              configValue === null
            ) {
              itemValue.value = configValue;
            }
          }
          return itemValue;
        })
      : [];

    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required && !p.sensitive));
    setRequiredProviderFormFields(existingConfiguration.filter((p) => p.required || p.sensitive));
  }, [config?.providerConfig, providerSchema, secrets]);

  return (
    <>
      <UseField
        path="config.provider"
        config={{
          validations: [
            {
              validator: fieldValidators.emptyField(LABELS.PROVIDER_REQUIRED),
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
                  id="xpack.inferenceEndpointUICommon.components.serviceLabel"
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
                closePopover={closeProviderPopover}
                className="rightArrowIcon"
              >
                <SelectableProvider
                  providers={providers}
                  onClosePopover={closeProviderPopover}
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
          <ConfigurationFormItems
            isLoading={false}
            direction="column"
            items={requiredProviderFormFields}
            setConfigEntry={onSetProviderConfigEntry}
          />
          <EuiSpacer size="m" />
          <AdditionalOptionsFields
            config={config}
            optionalProviderFormFields={optionalProviderFormFields}
            onSetProviderConfigEntry={onSetProviderConfigEntry}
            onTaskTypeOptionsSelect={onTaskTypeOptionsSelect}
            taskTypeOptions={taskTypeOptions}
            selectedTaskType={selectedTaskType}
          />
          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="xs" />
          <ProviderSecretHiddenField
            providerSchema={providerSchema}
            setRequiredProviderFormFields={setRequiredProviderFormFields}
            isSubmitting={isSubmitting}
          />
          <ProviderConfigHiddenField
            providerSchema={providerSchema}
            setRequiredProviderFormFields={setRequiredProviderFormFields}
            isSubmitting={isSubmitting}
          />
        </>
      ) : null}
    </>
  );
};
