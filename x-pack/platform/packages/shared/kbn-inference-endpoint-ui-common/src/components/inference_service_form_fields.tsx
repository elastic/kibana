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

import { HttpSetup, IToasts } from '@kbn/core/public';
import * as LABELS from '../translations';
import { Config, ConfigEntryView, InferenceProvider, Secrets } from '../types/types';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import { DEFAULT_TASK_TYPE, ServiceProviderKeys } from '../constants';
import { SelectableProvider } from './providers/selectable';
import {
  TaskTypeOption,
  generateInferenceEndpointId,
  getTaskTypeOptions,
  mapProviderFields,
} from '../utils/helpers';
import { ConfigurationFormItems } from './configuration/configuration_form_items';
import { AdditionalOptionsFields } from './additional_options_fields';
import { ProviderSecretHiddenField } from './hidden_fields/provider_secret_hidden_field';
import { ProviderConfigHiddenField } from './hidden_fields/provider_config_hidden_field';
import { useProviders } from '../hooks/use_providers';

interface InferenceServicesProps {
  http: HttpSetup;
  toasts: IToasts;
  isEdit?: boolean;
  isPreconfigured?: boolean;
}

export const InferenceServiceFormFields: React.FC<InferenceServicesProps> = ({
  http,
  toasts,
  isEdit,
  isPreconfigured,
}) => {
  const { data: providers, isLoading } = useProviders(http, toasts);
  const [updatedProviders, setUpdatedProviders] = useState<InferenceProvider[] | undefined>(
    undefined
  );
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
    (taskType: string, providerSelected?: string) => {
      setSelectedTaskType(taskType);

      const inferenceId = generateInferenceEndpointId({
        ...config,
        taskType,
      });

      const newProvider = updatedProviders?.find(
        (p) => p.service === (config.provider === '' ? providerSelected : config.provider)
      );
      if (newProvider) {
        const newProviderSchema: ConfigEntryView[] = mapProviderFields(taskType, newProvider);
        setProviderSchema(newProviderSchema);
      }

      // Update config and secrets with the new set of fields + keeps the entered data for a common
      const newConfig = { ...(config.providerConfig ?? {}) };
      const newSecrets = { ...(secrets?.providerSecrets ?? {}) };
      Object.keys(config.providerConfig ?? {}).forEach((k) => {
        if (!newProvider?.configurations[k].supported_task_types.includes(taskType)) {
          delete newConfig[k];
        }
      });
      if (secrets && secrets?.providerSecrets) {
        Object.keys(secrets.providerSecrets).forEach((k) => {
          if (!newProvider?.configurations[k].supported_task_types.includes(taskType)) {
            delete newSecrets[k];
          }
        });
      }

      updateFieldValues({
        config: {
          taskType,
          inferenceId,
          providerConfig: newConfig,
        },
        secrets: {
          providerSecrets: newSecrets,
        },
      });
    },
    [config, secrets, updateFieldValues, updatedProviders]
  );

  const onProviderChange = useCallback(
    (provider?: string) => {
      const newProvider = updatedProviders?.find((p) => p.service === provider);

      setTaskTypeOptions(getTaskTypeOptions(newProvider?.task_types ?? []));
      if (newProvider?.task_types && newProvider?.task_types.length > 0) {
        onTaskTypeOptionsSelect(newProvider?.task_types[0], provider);
      }

      const defaultProviderConfig: Record<string, unknown> = {};
      const defaultProviderSecrets: Record<string, unknown> = {};

      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(newProvider.task_types[0], newProvider)
        : [];
      if (newProvider) {
        setProviderSchema(newProviderSchema);
      }

      newProviderSchema.forEach((fieldConfig) => {
        if (!fieldConfig.sensitive) {
          if (fieldConfig && !!fieldConfig.default_value) {
            defaultProviderConfig[fieldConfig.key] = fieldConfig.default_value;
          } else {
            defaultProviderConfig[fieldConfig.key] = null;
          }
        } else {
          defaultProviderSecrets[fieldConfig.key] = null;
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
    [config, onTaskTypeOptionsSelect, updateFieldValues, updatedProviders]
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
        clear={isEdit ? undefined : { onClick: onClearProvider }}
        isDropdown
        isDisabled={isEdit}
        isInvalid={isInvalid}
        fullWidth
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : providerIcon}
      >
        <EuiFieldText
          onClick={toggleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
          disabled={isEdit}
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
      isEdit,
      onClearProvider,
      config?.provider,
      providerIcon,
      toggleProviderPopover,
      handleProviderKeyboardOpen,
      providerName,
      isProviderPopoverOpen,
    ]
  );

  useEffect(() => {
    if (providers) {
      // Ensure the Elastic Inference Service (EIS) appears at the top of the providers list
      const elasticServiceIndex = providers.findIndex((provider) => provider.service === 'elastic');
      if (elasticServiceIndex !== -1) {
        const elasticService = providers[elasticServiceIndex];
        const remainingProviders = providers.filter((_, index) => index !== elasticServiceIndex);
        setUpdatedProviders([elasticService, ...remainingProviders]);
      } else {
        setUpdatedProviders(providers);
      }
    }
  }, [providers]);

  useEffect(() => {
    if (config?.provider && config?.taskType && isEdit) {
      const newProvider = updatedProviders?.find((p) => p.service === config.provider);
      // Update connector providerSchema

      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(config.taskType, newProvider)
        : [];
      if (newProvider) {
        setProviderSchema(newProviderSchema);
      }
      setSelectedTaskType(config.taskType);
    }
  }, [config, config?.provider, config?.taskType, isEdit, selectedTaskType, updatedProviders]);

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
              configValue === null ||
              configValue === undefined
            ) {
              itemValue.value = configValue ?? null;
            }
          }
          return itemValue;
        })
      : [];

    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required && !p.sensitive));
    setRequiredProviderFormFields(existingConfiguration.filter((p) => p.required || p.sensitive));
  }, [config?.providerConfig, providerSchema, secrets, selectedTaskType]);

  const isInternalProvider = config?.provider === 'elasticsearch'; // To display link for model_ids for Elasticsearch provider

  return !isLoading ? (
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
                  providers={updatedProviders ?? []}
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
            isEdit={isEdit}
            isPreconfigured={isPreconfigured}
            isInternalProvider={isInternalProvider}
          />
          <EuiSpacer size="m" />
          <AdditionalOptionsFields
            config={config}
            optionalProviderFormFields={optionalProviderFormFields}
            onSetProviderConfigEntry={onSetProviderConfigEntry}
            onTaskTypeOptionsSelect={onTaskTypeOptionsSelect}
            taskTypeOptions={taskTypeOptions}
            selectedTaskType={selectedTaskType}
            isEdit={isEdit}
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
  ) : null;
};
