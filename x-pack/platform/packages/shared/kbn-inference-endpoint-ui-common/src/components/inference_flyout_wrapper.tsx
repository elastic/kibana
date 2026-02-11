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
  type EuiFlyoutProps,
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

const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

const formDeserializer = (data: InferenceEndpoint) => {
  if (
    data.config?.providerConfig?.adaptive_allocations?.max_number_of_allocations ||
    data.config?.headers
  ) {
    const { headers, ...restConfig } = data.config;
    const maxAllocations =
      data.config.providerConfig?.adaptive_allocations?.max_number_of_allocations;

    return {
      ...data,
      config: {
        ...restConfig,
        providerConfig: {
          ...(data.config.providerConfig as InferenceEndpoint['config']['providerConfig']),
          ...(headers ? { headers } : {}),
          ...(maxAllocations
            ? // remove the adaptive_allocations from the data config as form does not expect it
              { max_number_of_allocations: maxAllocations, adaptive_allocations: undefined }
            : {}),
        },
      },
    };
  }

  return data;
};

// This serializer is used to transform the form data before sending it to the server
export const formSerializer = (formData: InferenceEndpoint) => {
  const providerConfig = formData.config?.providerConfig as
    | InferenceEndpoint['config']['providerConfig']
    | undefined;
  if (formData && providerConfig) {
    const {
      max_number_of_allocations: maxAllocations,
      headers,
      ...restProviderConfig
    } = providerConfig || {};

    return {
      ...formData,
      config: {
        ...formData.config,
        providerConfig: {
          ...restProviderConfig,
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
        ...(headers ? { headers } : {}),
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
  focusTrapProps?: EuiFlyoutProps['focusTrapProps'];
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
  focusTrapProps,
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
      focusTrapProps={focusTrapProps}
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
