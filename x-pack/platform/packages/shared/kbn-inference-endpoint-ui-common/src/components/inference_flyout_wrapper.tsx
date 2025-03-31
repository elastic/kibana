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

import { HttpSetup, IToasts } from '@kbn/core/public';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as LABELS from '../translations';
import type { InferenceEndpoint } from '../types/types';
import { InferenceServiceFormFields } from './inference_service_form_fields';
import { useInferenceEndpointMutation } from '../hooks/use_inference_endpoint_mutation';

interface InferenceFlyoutWrapperProps {
  onFlyoutClose: () => void;
  http: HttpSetup;
  toasts: IToasts;
  isEdit?: boolean;
  onSubmitSuccess?: (inferenceId: string) => void;
  inferenceEndpoint?: InferenceEndpoint;
}

export const InferenceFlyoutWrapper: React.FC<InferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  http,
  toasts,
  isEdit,
  onSubmitSuccess,
  inferenceEndpoint,
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
      },
      secrets: {
        providerSecrets: {},
      },
    },
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
            isEdit={isEdit}
            isPreconfigured={isPreconfigured}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="success"
                size="m"
                isLoading={form.isSubmitting || isLoading}
                disabled={
                  (!form.isValid && form.isSubmitted) || isLoading || isPreconfigured // Disable edit option for preconfigured endpoints
                }
                data-test-subj="inference-endpoint-submit-button"
                onClick={handleSubmit}
              >
                {LABELS.SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
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
