/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  EuiFieldText,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHorizontalRule,
  EuiInputPopover,
  EuiSpacer,
  EuiTitle,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import type { HttpSetup, IToasts } from '@kbn/core/public';
import { EisCloudConnectPromoTour } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import * as LABELS from '../translations';
import type { Config, ConfigEntryView, InferenceProvider, Secrets } from '../types/types';
import { FieldType, isMapWithStringValues } from '../types/types';
import {
  SERVICE_PROVIDERS,
  solutionKeys,
  type ProviderSolution,
} from './providers/render_service_provider/service_provider';
import type { ServiceProviderKeys } from '../constants';
import {
  DEFAULT_TASK_TYPE,
  INTERNAL_OVERRIDE_FIELDS,
  serviceProviderLinkComponents,
} from '../constants';
import { SelectableProvider } from './providers/selectable';
import type { TaskTypeOption } from '../utils/helpers';
import {
  generateInferenceEndpointId,
  getTaskTypeOptions,
  mapProviderFields,
} from '../utils/helpers';
import { ConfigurationFormItems } from './configuration/configuration_form_items';
import { MoreOptionsFields } from './more_options_fields';
import { AdditionalOptionsFields } from './additional_options_fields';
import { AuthenticationFormItems } from './configuration/authentication_form_items';
import { ProviderSecretHiddenField } from './hidden_fields/provider_secret_hidden_field';
import { ProviderConfigHiddenField } from './hidden_fields/provider_config_hidden_field';
import { useProviders } from '../hooks/use_providers';
import { useKibana } from '../hooks/use_kibana';

// Custom trigger button CSS
export const buttonCss = css`
  &:hover {
    text-decoration: none;
  }
`;
export const accordionCss = css`
  .euiAccordion__triggerWrapper {
    display: inline-flex;
  }
`;

const providerConfigConfig = {
  validations: [
    {
      validator: fieldValidators.emptyField(LABELS.PROVIDER_REQUIRED),
      isBlocking: true,
    },
  ],
};

export function isProviderForSolutions(
  filterBySolution: SolutionView,
  provider: InferenceProvider
) {
  const providerSolutions =
    SERVICE_PROVIDERS[provider.service as ServiceProviderKeys]?.solutions ?? [];
  return (
    !solutionKeys[filterBySolution] ||
    (solutionKeys[filterBySolution] !== undefined &&
      providerSolutions.includes(solutionKeys[filterBySolution] as ProviderSolution))
  );
}

interface InferenceServicesProps {
  config: {
    isEdit?: boolean;
    enforceAdaptiveAllocations?: boolean;
    currentSolution?: SolutionView;
    isPreconfigured?: boolean;
    allowContextWindowLength?: boolean;
    reenterSecretsOnEdit?: boolean;
    allowTemperature?: boolean;
    enableEisPromoTour?: boolean;
  };
  http: HttpSetup;
  toasts: IToasts;
}

export const InferenceServiceFormFields: React.FC<InferenceServicesProps> = ({
  http,
  toasts,
  config: {
    allowContextWindowLength,
    allowTemperature,
    isEdit,
    enforceAdaptiveAllocations,
    isPreconfigured,
    currentSolution,
    reenterSecretsOnEdit,
    enableEisPromoTour,
  },
}) => {
  const {
    services: { application, cloud },
  } = useKibana();
  const { data: providers, isLoading } = useProviders(http, toasts);
  const { euiTheme } = useEuiTheme();
  const [updatedProviders, setUpdatedProviders] = useState<InferenceProvider[] | undefined>(
    undefined
  );
  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);
  const [providerSchema, setProviderSchema] = useState<ConfigEntryView[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeOption[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>(DEFAULT_TASK_TYPE);
  const [solutionFilter, setSolutionFilter] = useState<SolutionView | undefined>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const { updateFieldValues, setFieldValue, validateFields, isSubmitting } = useFormContext();
  const [optionalProviderFormFields, setOptionalProviderFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [providerSettingsFormFields, setProviderSettingsFormFields] = useState<ConfigEntryView[]>(
    []
  );
  const [authenticationFormFields, setAuthenticationFormFields] = useState<ConfigEntryView[]>([]);
  const [{ config, secrets }] = useFormData<ConnectorFormSchema<Config, Secrets>>({
    watch: [
      'secrets.providerSecrets',
      'config.taskType',
      'config.inferenceId',
      'config.contextWindowLength',
      'config.temperature',
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

  const getOverrides = useCallback(
    (provider?: InferenceProvider) => {
      let overrides = INTERNAL_OVERRIDE_FIELDS[provider?.service ?? ''];
      // Return early if override only applies to serverless and this is not on serverless
      if (overrides?.serverlessOnly && !enforceAdaptiveAllocations) {
        return;
      }

      const hiddenFields = [...(overrides?.hidden ?? [])];

      if (provider?.configurations) {
        Object.entries(provider.configurations).forEach(([field, configEntry]) => {
          if (Object.values(FieldType).includes(configEntry.type) === false) {
            // hide unknown type fields in form as they aren't handled yet
            hiddenFields.push(field);
          }
        });
      }

      overrides = {
        ...(overrides ?? {}),
        hidden: hiddenFields,
      };

      return overrides;
    },
    [enforceAdaptiveAllocations]
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
      const overrides = newProvider ? getOverrides(newProvider) : undefined;
      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(taskType, newProvider, overrides)
        : [];
      if (newProvider) {
        setProviderSchema(newProviderSchema);
      }

      // Update config and secrets with the new set of fields + keeps the entered data for a common
      const newConfig = { ...(config.providerConfig ?? {}) };
      const newSecrets = { ...(secrets?.providerSecrets ?? {}) };

      // Iterate through the new provider configurations so we can ensure all fields supporting task type are added
      Object.keys(newProvider?.configurations ?? {}).forEach((k) => {
        if (
          (newConfig[k] !== undefined &&
            newProvider?.configurations[k]?.supported_task_types &&
            !newProvider?.configurations[k].supported_task_types.includes(taskType)) ||
          // Remove fields of unknown and unhandled types
          Object.values(FieldType).includes(
            newProvider?.configurations[k]?.type ?? ('' as FieldType)
          ) === false
        ) {
          delete newConfig[k];
        } else if (
          newConfig[k] === undefined &&
          newProvider?.configurations[k]?.supported_task_types &&
          newProvider?.configurations[k].supported_task_types.includes(taskType)
        ) {
          // Get default value from schema (which includes overridden defaults from INTERNAL_OVERRIDE_FIELDS)
          const schemaField = newProviderSchema.find((f) => f.key === k);
          newConfig[k] = schemaField?.default_value ?? null;
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
    [config, secrets, updateFieldValues, updatedProviders, getOverrides]
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

      const overrides = getOverrides(newProvider);

      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(newProvider.task_types[0], newProvider, overrides)
        : [];
      if (newProvider) {
        setProviderSchema(newProviderSchema);
      }

      newProviderSchema.forEach((fieldConfig) => {
        if (!fieldConfig.sensitive) {
          // default_value now includes overridden defaults from INTERNAL_OVERRIDE_FIELDS
          defaultProviderConfig[fieldConfig.key] = fieldConfig.default_value;
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
          contextWindowLength: '',
        },
        secrets: {
          providerSecrets: defaultProviderSecrets,
        },
      });
    },
    [config, onTaskTypeOptionsSelect, updateFieldValues, updatedProviders, getOverrides]
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
          ? providers.filter(isProviderForSolutions.bind(this, filterBySolution))
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

      const overrides = getOverrides(newProvider);
      const newProviderSchema: ConfigEntryView[] = newProvider
        ? mapProviderFields(config.taskType, newProvider, overrides)
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
    selectedTaskType,
    updatedProviders,
    getOverrides,
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
              (typeof configValue === 'object' && isMapWithStringValues(configValue)) ||
              configValue === null ||
              configValue === undefined
            ) {
              itemValue.value = configValue ?? null;
            }
          }
          return itemValue;
        })
      : [];

    setProviderSettingsFormFields(existingConfiguration.filter((p) => p.required && !p.sensitive));
    setOptionalProviderFormFields(existingConfiguration.filter((p) => !p.required && !p.sensitive));
    setAuthenticationFormFields(existingConfiguration.filter((p) => p.sensitive));
  }, [config?.providerConfig, providerSchema, secrets, selectedTaskType]);

  const isInternalProvider = config?.provider === 'elasticsearch'; // To display link for model_ids for Elasticsearch provider

  useEffect(() => {
    // Trigger once on mount, then clean up
    const delay = parseInt(euiTheme.animation.normal ?? '0', 10);

    const timeout = window.setTimeout(() => {
      setIsFlyoutOpen(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [euiTheme.animation.normal]);

  return !isLoading ? (
    <>
      <UseField path="config.provider" config={providerConfigConfig}>
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
          const selectInput = providerSuperSelect(isInvalid);
          const formRow = (
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
                <EuiSpacer size="s" />
                <EuiInputPopover
                  id={'providerInputPopoverId'}
                  fullWidth
                  input={selectInput}
                  isOpen={isProviderPopoverOpen}
                  closePopover={closeProviderPopover}
                  className="rightArrowIcon"
                >
                  <SelectableProvider
                    currentSolution={currentSolution}
                    providers={updatedProviders ?? []}
                    onClosePopover={closeProviderPopover}
                    onProviderChange={onProviderChange}
                    onSolutionFilterChange={toggleAndApplyFilter}
                    solutionFilter={solutionFilter}
                  />
                </EuiInputPopover>
              </>
            </EuiFormRow>
          );
          return enableEisPromoTour ? (
            <EisCloudConnectPromoTour
              promoId="eisInferenceEndpointFlyout"
              navigateToApp={() => application.navigateToApp(CLOUD_CONNECT_NAV_ID)}
              isSelfManaged={!cloud?.isCloudEnabled}
              isReady={isFlyoutOpen}
            >
              {formRow}
            </EisCloudConnectPromoTour>
          ) : (
            formRow
          );
        }}
      </UseField>
      {config?.provider ? (
        <>
          <EuiHorizontalRule margin="m" />
          {/* SETTINGS */}
          <EuiTitle size="xxs" data-test-subj="settings-label">
            <h4>
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.settingsLabel"
                defaultMessage="Settings"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <ConfigurationFormItems
            dataTestSubj="configuration-fields"
            isLoading={false}
            direction="column"
            descriptionLinks={serviceProviderLinkComponents[config.provider as ServiceProviderKeys]}
            items={providerSettingsFormFields}
            setConfigEntry={onSetProviderConfigEntry}
            isEdit={isEdit}
            isPreconfigured={isPreconfigured}
            isInternalProvider={isInternalProvider}
          />
          <EuiSpacer size="s" />
          {optionalProviderFormFields.length > 0 ? (
            <>
              <MoreOptionsFields
                optionalProviderFormFields={optionalProviderFormFields}
                onSetProviderConfigEntry={onSetProviderConfigEntry}
                isEdit={isEdit}
              />
              <EuiHorizontalRule margin="m" />
            </>
          ) : null}
          {/* AUTHENTICATION */}
          {authenticationFormFields.length > 0 ? (
            <>
              <AuthenticationFormItems
                isLoading={false}
                items={authenticationFormFields}
                setConfigEntry={onSetProviderConfigEntry}
                isEdit={isEdit}
                isPreconfigured={isPreconfigured}
                reenterSecretsOnEdit={reenterSecretsOnEdit}
              />
              <EuiHorizontalRule margin="m" />
            </>
          ) : null}
          {/* ADDITIONAL OPTIONS */}
          <AdditionalOptionsFields
            config={config}
            onTaskTypeOptionsSelect={onTaskTypeOptionsSelect}
            taskTypeOptions={taskTypeOptions}
            selectedTaskType={selectedTaskType}
            isEdit={isEdit}
            allowContextWindowLength={allowContextWindowLength}
            allowTemperature={allowTemperature}
          />
          {/* HIDDEN VALIDATION */}
          <ProviderSecretHiddenField
            requiredProviderFormFields={authenticationFormFields}
            setRequiredProviderFormFields={setAuthenticationFormFields}
            isSubmitting={isSubmitting}
          />
          <ProviderConfigHiddenField
            requiredProviderFormFields={providerSettingsFormFields}
            setRequiredProviderFormFields={setProviderSettingsFormFields}
            isSubmitting={isSubmitting}
          />
        </>
      ) : null}
    </>
  ) : null;
};
