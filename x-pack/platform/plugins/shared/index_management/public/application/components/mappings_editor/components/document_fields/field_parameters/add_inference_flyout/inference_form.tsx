/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import { InferenceProvider, InferenceServiceFormFields } from '@kbn/inference-endpoint-ui-common';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { useAddEndpoint } from '../../../../../../hooks/use_add_endpoint';
import { useProviders } from '../../../../../../hooks/use_providers';
import { InferenceEndpoint } from '../../../../../../../../common/types/inference';

interface InferenceFormProps {
  onSubmitSuccess: () => void;
  resendRequest: () => void;
}
export const InferenceForm: React.FC<InferenceFormProps> = ({ onSubmitSuccess, resendRequest }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [providers, setProviders] = useState<InferenceProvider[] | null>();

  const onSuccess = useCallback(() => {
    setIsLoading(false);
    onSubmitSuccess();
    resendRequest();
  }, [onSubmitSuccess, resendRequest]);
  const onError = useCallback(() => {
    setIsLoading(false);
  }, []);
  const { addInferenceEndpoint } = useAddEndpoint(
    () => onSuccess(),
    () => onError()
  );
  const { fetchInferenceServices } = useProviders();
  const { form } = useForm();
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    const { isValid, data } = await form.submit();

    if (isValid) {
      addInferenceEndpoint(data as InferenceEndpoint);
    } else {
      setIsLoading(false);
    }
  }, [addInferenceEndpoint, form]);

  useEffect(() => {
    const fetchData = async () => {
      const services = await fetchInferenceServices();
      setProviders(services);
    };

    fetchData();
  }, [fetchInferenceServices]);

  return providers ? (
    <Form form={form}>
      <InferenceServiceFormFields providers={providers} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="success"
            size="m"
            isLoading={form.isSubmitting || isLoading}
            disabled={(!form.isValid && form.isSubmitted) || isLoading}
            data-test-subj="add-inference-endpoint-submit-button"
            onClick={handleSubmit}
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.createInferenceFlyoutFormSaveButton',
              {
                defaultMessage: 'Save',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  ) : null;
};
