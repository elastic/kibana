/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  EuiInputPopover,
  keys,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';

import { ConfigEntryView } from '@kbn/search-connectors';
import * as i18n from '../translations';
import { Config, InferenceProvider, Secrets } from '../types/types';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import { DEFAULT_TASK_TYPE, ServiceProviderKeys } from '../constants';
import { SelectableProvider } from './providers/selectable';
import { TaskTypeOption, generateInferenceEndpointId, getTaskTypeOptions } from '../utils/helpers';

interface InferenceServicesProps {
  providers: InferenceProvider[];
}

export const InferenceServices: React.FC<InferenceServicesProps> = ({ providers }) => {
  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);
  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [taskTypeSchema, setTaskTypeSchema] = useState<ConfigEntryView[]>([]);

  const { updateFieldValues, setFieldValue } = useFormContext();
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.taskTypeConfig',
      'config.inferenceId',
      'config.provider',
      'config.providerConfig',
    ],
  });

  console.log(providerSchema, taskTypeOptions, selectedTaskType, taskTypeSchema, secrets);

  const handleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleProviderClosePopover = useCallback(() => {
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

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        isDropdown
        isInvalid={isInvalid}
        fullWidth
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : providerIcon}
      >
        <EuiFieldText
          onClick={handleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
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
      config?.provider,
      handleProviderKeyboardOpen,
      handleProviderPopover,
      isProviderPopoverOpen,
      providerIcon,
      providerName,
    ]
  );

  const onTaskTypeOptionsSelect = useCallback(
    (taskType: string, provider?: string) => {
      // Get task type settings
      const currentProvider = providers?.find((p) => p.provider === (provider ?? config?.provider));
      const currentTaskTypes = currentProvider?.task_types;
      const newTaskType = currentTaskTypes?.find((p) => p.task_type === taskType);

      setSelectedTaskType(taskType);

      // transform the schema
      const newTaskTypeSchema = Object.keys(newTaskType?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newTaskType?.configuration[k],
      })) as ConfigEntryView[];
      setTaskTypeSchema(newTaskTypeSchema);

      const configDefaults = Object.keys(newTaskType?.configuration ?? {}).reduce(
        (res: Record<string, unknown>, k) => {
          if (newTaskType?.configuration[k] && !!newTaskType?.configuration[k].default_value) {
            res[k] = newTaskType.configuration[k].default_value;
          } else {
            res[k] = null;
          }
          return res;
        },
        {}
      );

      updateFieldValues({
        config: {
          taskType,
          taskTypeConfig: configDefaults,
        },
      });
      generateInferenceEndpointId(
        { ...config, taskType, taskTypeConfig: configDefaults },
        setFieldValue
      );
    },
    [config, providers, setFieldValue, updateFieldValues]
  );

  const onProviderChange = useCallback(
    (provider?: string) => {
      const newProvider = providers?.find((p) => p.provider === provider);

      // Update task types list available for the selected provider
      const providerTaskTypes = (newProvider?.task_types ?? []).map((t) => t.task_type);
      setTaskTypeOptions(getTaskTypeOptions(providerTaskTypes));
      if (providerTaskTypes.length > 0) {
        onTaskTypeOptionsSelect(providerTaskTypes[0], provider);
      }

      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configuration ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configuration[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);

      const defaultProviderConfig: Record<string, unknown> = {};
      const defaultProviderSecrets: Record<string, unknown> = {};

      Object.keys(newProvider?.configuration ?? {}).forEach((k) => {
        if (!newProvider?.configuration[k].sensitive) {
          if (newProvider?.configuration[k] && !!newProvider?.configuration[k].default_value) {
            defaultProviderConfig[k] = newProvider.configuration[k].default_value;
          } else {
            defaultProviderConfig[k] = null;
          }
        } else {
          defaultProviderSecrets[k] = null;
        }
      });

      updateFieldValues({
        config: {
          provider: newProvider?.provider,
          providerConfig: defaultProviderConfig,
        },
        secrets: {
          providerSecrets: defaultProviderSecrets,
        },
      });
    },
    [onTaskTypeOptionsSelect, providers, updateFieldValues]
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
                  // isLoading={isLoading}
                  // getSelectableOptions={getProviderOptions}
                  providers={providers}
                  onClosePopover={handleProviderClosePopover}
                  onProviderChange={onProviderChange}
                />
              </EuiInputPopover>
            </EuiFormRow>
          );
        }}
      </UseField>
      {/* {config?.provider ? (
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
            taskTypeSchema={taskTypeSchema}
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
          {getTaskTypeConfigHiddenField(taskTypeSchema, setTaskTypeFormFields, isSubmitting)}
        </>
      ) : null} */}
    </>
  );
};
