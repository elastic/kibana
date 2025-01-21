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
import React, { useCallback, useState } from 'react';

import { HttpSetup, IToasts } from '@kbn/core/public';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as LABELS from '../translations';
import { InferenceEndpoint } from '../types/types';
import { InferenceServiceFormFields } from './inference_service_form_fields';

interface InferenceFlyoutWrapperProps {
  onFlyoutClose: (state: boolean) => void;
  addInferenceEndpoint: (
    inferenceEndpoint: InferenceEndpoint,
    onSuccess: () => void,
    onError: () => void
  ) => Promise<void>;
  http: HttpSetup;
  toasts: IToasts;
  onSubmitSuccess?: () => void;
  isEdit?: boolean;
}

export const InferenceFlyoutWrapper: React.FC<InferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  addInferenceEndpoint,
  http,
  toasts,
  onSubmitSuccess,
  isEdit,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'InferenceFlyoutId',
  });
  const closeFlyout = () => onFlyoutClose(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccess = useCallback(() => {
    setIsLoading(false);
    onSubmitSuccess?.();
  }, [onSubmitSuccess]);
  const onError = useCallback(() => {
    setIsLoading(false);
  }, []);

  const { form } = useForm();
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    const { isValid, data } = await form.submit();

    if (isValid) {
      addInferenceEndpoint(data as InferenceEndpoint, onSuccess, onError);
    } else {
      setIsLoading(false);
    }
  }, [addInferenceEndpoint, form, onError, onSuccess]);

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
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
          <InferenceServiceFormFields http={http} toasts={toasts} isEdit={isEdit} />
          <EuiSpacer size="m" />
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
        </Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="inference-flyout-close-button"
              onClick={closeFlyout}
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
