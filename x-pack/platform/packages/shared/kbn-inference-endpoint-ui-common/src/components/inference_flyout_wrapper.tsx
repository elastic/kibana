/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import type { HttpSetup, IToasts } from '@kbn/core/public';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as LABELS from '../translations';
import type { InferenceEndpoint } from '../types/types';
import { InferenceServiceFormFields } from './inference_service_form_fields';
import { useInferenceEndpointMutation } from '../hooks/use_inference_endpoint_mutation';
import { ServiceProviderKeys } from '../constants';

const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

// This serializer is used to transform the saved object data before sending it to be displayed in the form
const formDeserializer = (data: InferenceEndpoint) => {
  const { headers, ...restConfig } = data.config;
  const taskSettings = restConfig.providerConfig?.task_settings ?? {};
  const { max_tokens: maxTokens, ...restTaskSettings } = taskSettings;
  const maxAllocations =
    restConfig?.providerConfig?.task_settings?.adaptive_allocations?.max_number_of_allocations ??
    restConfig?.providerConfig?.adaptive_allocations?.max_number_of_allocations;

  return {
    ...data,
    config: {
      ...restConfig,
      providerConfig: {
        service_settings: {
          ...(restConfig.providerConfig?.service_settings ?? restConfig.providerConfig),
          ...(headers ? { headers } : {}),
          ...(maxAllocations
            ? // remove the adaptive_allocations from the data config as form does not expect it
              { max_number_of_allocations: maxAllocations, adaptive_allocations: undefined }
            : {}),
          // Until 'location' field changes are in, move max_tokens to service_settings as form expects it
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        },
        task_settings: restTaskSettings,
      },
    },
  };
};

// This serializer is used to transform the form data before sending it to the server
export const formSerializer = (formData: InferenceEndpoint) => {
  const serviceSettings = formData.config?.providerConfig?.service_settings ?? {};
  const taskSettings = formData.config?.providerConfig?.task_settings ?? {};

  const {
    max_number_of_allocations: maxAllocations,
    headers,
    max_tokens,
    ...restServiceSettings
  } = serviceSettings;

  if (formData && (serviceSettings || taskSettings)) {
    return {
      ...formData,
      config: {
        ...formData.config,
        providerConfig: {
          service_settings: {
            ...restServiceSettings,
            ...(maxAllocations
              ? {
                  adaptive_allocations: {
                    enabled: true,
                    min_number_of_allocations: MIN_ALLOCATIONS,
                    ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
                  },
                  // Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
                  num_threads: DEFAULT_NUM_THREADS,
                }
              : {}),
          },
          // NOTE: These updates to task_settings are a temporary workaround for anthropic max_tokens handling and any service with headers until the services endpoint is updated to include the 'location' field which indicates where the config fields go.
          // For max_tokens, anthropic is unique in that it requires max_tokens to be sent as part of the task_settings instead of the usual service_settings.
          // Until the services endpoint is updated to reflect that, there is no way for the form UI to know where to put max_tokens. This can be removed once that update is made.
          task_settings: {
            ...taskSettings,
            ...(headers ? { headers } : {}),
            ...(formData.config?.provider === ServiceProviderKeys.anthropic && max_tokens
              ? { max_tokens }
              : {}),
          },
        },
      },
    };
  }

  return formData;
};

interface InferenceFlyoutWrapperProps {
  onFlyoutClose: () => void;
  http: HttpSetup;
  toasts: IToasts;
  isEdit?: boolean;
  enforceAdaptiveAllocations?: boolean;
  onSubmitSuccess?: (inferenceId: string) => void;
  inferenceEndpoint?: InferenceEndpoint;
  enableEisPromoTour?: boolean;
}

export const InferenceFlyoutWrapper: React.FC<InferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  http,
  toasts,
  isEdit,
  enforceAdaptiveAllocations = false,
  onSubmitSuccess,
  inferenceEndpoint,
  enableEisPromoTour,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'InferenceFlyoutId',
  });
  const onSuccessCallback = useCallback(
    (inferenceId: string) => {
      onSubmitSuccess?.(inferenceId);
      onFlyoutClose();
    },
    [onFlyoutClose, onSubmitSuccess]
  );
  const { mutate, isLoading } = useInferenceEndpointMutation(http, toasts, onSuccessCallback);

  const { form } = useForm({
    defaultValue: {
      config: {
        inferenceId: inferenceEndpoint?.config.inferenceId ?? '',
        taskType: inferenceEndpoint?.config.taskType ?? '',
        provider: inferenceEndpoint?.config.provider ?? '',
        providerConfig: inferenceEndpoint?.config.providerConfig,
        contextWindowLength: inferenceEndpoint?.config.contextWindowLength ?? undefined,
        headers: inferenceEndpoint?.config?.headers,
        temperature: inferenceEndpoint?.config.temperature ?? undefined,
      },
      secrets: {
        providerSecrets: {},
      },
    },
    serializer: formSerializer,
    deserializer: formDeserializer,
  });
  const handleSubmit = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (!isValid) {
      return;
    }

    mutate(data, !!isEdit);
  }, [form, isEdit, mutate]);

  const isPreconfigured = inferenceEndpoint?.config.inferenceId.startsWith('.');

  return (
    <EuiFlyout
      ownFocus
      onClose={onFlyoutClose}
      aria-labelledby={inferenceCreationFlyoutId}
      data-test-subj="inference-flyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="inference-flyout-header">
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>{LABELS.ENDPOINT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Form form={form}>
          <InferenceServiceFormFields
            http={http}
            toasts={toasts}
            config={{
              isEdit,
              enforceAdaptiveAllocations,
              isPreconfigured,
              reenterSecretsOnEdit: false,
              enableEisPromoTour,
            }}
          />
          <EuiSpacer size="m" />
          {isPreconfigured ? null : (
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="success"
                  size="m"
                  isLoading={form.isSubmitting || isLoading}
                  disabled={(!form.isValid && form.isSubmitted) || isLoading}
                  data-test-subj="inference-endpoint-submit-button"
                  onClick={handleSubmit}
                >
                  {LABELS.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="inference-flyout-close-button"
              onClick={onFlyoutClose}
              flush="left"
            >
              {LABELS.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
