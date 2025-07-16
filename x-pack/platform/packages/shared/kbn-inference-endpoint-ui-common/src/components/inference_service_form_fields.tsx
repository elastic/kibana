/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  EuiButtonGroup,
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
import {
  SERVICE_PROVIDERS,
  solutionKeys,
  type ProviderSolution,
} from './providers/render_service_provider/service_provider';
import { DEFAULT_TASK_TYPE, ServiceProviderKeys, INTERNAL_OVERRIDE_FIELDS } from '../constants';
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
  enforceAdaptiveAllocations?: boolean;
  isPreconfigured?: boolean;
  currentSolution?: SolutionView;
}

export const InferenceServiceFormFields: React.FC<InferenceServicesProps> = ({
  http,
  toasts,
  isEdit,
  enforceAdaptiveAllocations,
  isPreconfigured,
  currentSolution,
}) => {
  const { data: providers, isLoading } = useProviders(http, toasts);
  const [updatedProviders, setUpdatedProviders] = useState<InferenceProvider[] | undefined>(
    undefined
  );
  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);
  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [solutionFilter, setSolutionFilter] = useState<SolutionView | undefined>();

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

  const toggleAndApplyFilter = (selectedFilter: SolutionView) => {
    if (selectedFilter === solutionFilter) {
      // If the selected filter is already active, toggle off by clearing filter and resetting providers
      setUpdatedProviders(providers);
      setSolutionFilter(undefined);
      return;
    }

    setSolutionFilter(selectedFilter);
    setUpdatedProviders(getUpdatedProviders(selectedFilter));
  };

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
        const newProviderSchema: ConfigEntryView[] = mapProviderFields(
          taskType,
          newProvider,
          enforceAdaptiveAllocations ? INTERNAL_OVERRIDE_FIELDS[newProvider.service] : undefined
        );
        setProviderSchema(newProviderSchema);
      }

      // Update config and secrets with the new set of fields + keeps the entered data for a common
      const newConfig = { ...(config.providerConfig ?? {}) };
      const newSecrets = { ...(secrets?.providerSecrets ?? {}) };
      Object.keys(config.providerConfig ?? {}).forEach((k) => {
        if (
          newProvider?.configurations[k]?.supported_task_types &&
          !newProvider?.configurations[k].supported_task_types.includes(taskType)
        ) {
          delete newConfig[k];
        }
      });
      if (secrets && secrets?.providerSecrets) {
        Object.keys(secrets.providerSecrets).forEach((k) => {
          if (
            newProvider?.configurations[k]?.supported_task_types &&
            !newProvider?.configurations[k].supported_task_types.includes(taskType)
          ) {
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
    [config, enforceAdaptiveAllocations, secrets, updateFieldValues, updatedProviders]
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
        ? mapProviderFields(
            newProvider.task_types[0],
            newProvider,
            enforceAdaptiveAllocations ? INTERNAL_OVERRIDE_FIELDS[newProvider.service] : undefined
          )
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
    [
      config,
      enforceAdaptiveAllocations,
      onTaskTypeOptionsSelect,
      updateFieldValues,
      updatedProviders,
    ]
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
        icon={!config?.provider ? { type: 'sparkles', side: 'left' } : undefined}
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
      toggleProviderPopover,
      handleProviderKeyboardOpen,
      providerName,
      isProviderPopoverOpen,
    ]
  );

  const getUpdatedProviders = useCallback(
    (filterBySolution?: SolutionView) => {
      if (providers) {
        const filteredProviders = filterBySolution
          ? providers.filter((provider) => {
              const providerSolutions =
                SERVICE_PROVIDERS[provider.service as ServiceProviderKeys]?.solutions ?? [];
              return (
                !solutionKeys[filterBySolution] ||
                (solutionKeys[filterBySolution] !== undefined &&
                  providerSolutions.includes(solutionKeys[filterBySolution] as ProviderSolution))
              );
            })
          : providers;

        // Ensure the Elastic Inference Service (EIS) appears at the top of the providers list
        const elasticServiceIndex = filteredProviders.findIndex(
          (provider) => provider.service === 'elastic'
        );

        if (elasticServiceIndex !== -1) {
          const elasticService = filteredProviders[elasticServiceIndex];
          const remainingProviders = filteredProviders.filter(
            (_, index) => index !== elasticServiceIndex
          );
          return [elasticService, ...remainingProviders];
        } else {
          return filteredProviders;
        }
      }
    },
    [providers]
  );

  useEffect(() => {
    if (providers) {
      // Set default filter if applicable
      const inApplicableSolution =
        currentSolution && Object.keys(solutionKeys).includes(currentSolution);

      if (inApplicableSolution) {
        setSolutionFilter(currentSolution);
      }
      setUpdatedProviders(getUpdatedProviders(currentSolution));
    }
  }, [providers, currentSolution, getUpdatedProviders]);

  useEffect(() => {
    if (config?.provider && config?.taskType && isEdit) {
      const newProvider = updatedProviders?.find((p) => p.service === config.provider);
      // Update connector providerSchema

      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(
            config.taskType,
            newProvider,
            enforceAdaptiveAllocations ? INTERNAL_OVERRIDE_FIELDS[newProvider.service] : undefined
          )
        : [];
      if (newProvider) {
        setProviderSchema(newProviderSchema);
      }
      setSelectedTaskType(config.taskType);
    }
  }, [
    config,
    config?.provider,
    config?.taskType,
    isEdit,
    enforceAdaptiveAllocations,
    selectedTaskType,
    updatedProviders,
  ]);

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
              <>
                {/* Only show filter if within applicable solution/project space */}
                {currentSolution && Object.keys(solutionKeys).includes(currentSolution) ? (
                  <EuiButtonGroup
                    legend="Solution filter"
                    idSelected={solutionFilter ?? ''}
                    onChange={(solution) => toggleAndApplyFilter(solution as SolutionView)}
                    options={Object.keys(solutionKeys).map((solution) => ({
                      id: solution,
                      label: solutionKeys[solution as SolutionView],
                      key: solution,
                      'data-test-subj': `filterBySolution-${solution}`,
                    }))}
                    type="single"
                    color="text"
                  />
                ) : null}
                <EuiSpacer size="s" />
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
              </>
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
