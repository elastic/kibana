/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSuperSelect } from '@elastic/eui';

import React, { useMemo, useState } from 'react';
import { connectToApiOptions, isEmpty, setModalConfigResponse } from '../lib/shared_values';
import type { ModelConfig } from '../types';
import { Service } from '../types';
import { InferenceFlyout } from './flyout_layout';
import type { SaveMappingOnClick } from './inference_flyout_wrapper';
import { CohereForm } from './service_forms/cohere_form';
import { HuggingFaceForm } from './service_forms/huggingface_form';
import { OpenaiForm } from './service_forms/openai_form';

interface Props extends SaveMappingOnClick {
  description: string;
  onInferenceEndpointChange: (inferenceId: string) => void;
  inferenceEndpointError?: string;
}
export const ConnectToApi: React.FC<Props> = ({
  description,
  onSaveInferenceEndpoint,
  isCreateInferenceApiLoading,
  onInferenceEndpointChange,
  inferenceEndpointError,
}) => {
  const defaultOpenaiUrl = 'https://api.openai.com/v1/embeddings';
  const defaultCohereModelId = 'embed-english-v2.0';

  const [selectedModelType, setSelectedModelType] = useState(connectToApiOptions[0].value);

  const [huggingFaceApiKey, setHuggingFaceApiKey] = useState('');
  const [huggingFaceModelUrl, setHuggingFaceModelUrl] = useState('');

  const [cohereApiKey, setCohereApiKey] = useState('');
  const [cohereModelId, setCohereModelId] = useState(defaultCohereModelId);

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiEndpointlUrl, setOpenaiEndpointUrl] = useState(defaultOpenaiUrl);
  const [openaiOrganizationId, openaiSetOrganizationId] = useState('');
  const [openaiModelId, setOpenaiModelId] = useState('');

  // disable save button if required fields are empty
  const areRequiredFieldsEmpty = useMemo(() => {
    if (selectedModelType === Service.huggingFace) {
      return isEmpty(huggingFaceModelUrl) || isEmpty(huggingFaceApiKey);
    } else if (selectedModelType === Service.cohere) {
      return isEmpty(cohereApiKey);
    } else {
      // open ai
      return isEmpty(openaiApiKey) || isEmpty(openaiModelId);
    }
  }, [
    selectedModelType,
    huggingFaceModelUrl,
    huggingFaceApiKey,
    cohereApiKey,
    openaiApiKey,
    openaiModelId,
  ]);

  // reset form values
  const onChangeModelType = (newSelectedServiceType: Service) => {
    switch (selectedModelType) {
      case Service.huggingFace:
        setHuggingFaceApiKey('');
        setHuggingFaceModelUrl('');
        break;

      case Service.cohere:
        setCohereApiKey('');
        setCohereModelId(defaultCohereModelId);
        break;

      case Service.openai:
        setOpenaiApiKey('');
        setOpenaiEndpointUrl(defaultOpenaiUrl);
        openaiSetOrganizationId('');
        setOpenaiModelId('');
        break;
    }
    setSelectedModelType(newSelectedServiceType);
  };

  const modelConfig: ModelConfig = useMemo(() => {
    if (selectedModelType === Service.huggingFace) {
      return setModalConfigResponse(Service.huggingFace, {
        api_key: huggingFaceApiKey,
        url: huggingFaceModelUrl,
      });
    } else if (selectedModelType === Service.cohere) {
      return setModalConfigResponse(Service.cohere, {
        api_key: cohereApiKey,
        model_id: isEmpty(cohereModelId) ? defaultCohereModelId : cohereModelId,
      });
    } else {
      return setModalConfigResponse(Service.openai, {
        api_key: openaiApiKey,
        model_id: openaiModelId,
        organization_id: isEmpty(openaiOrganizationId) ? undefined : openaiOrganizationId,
        url: isEmpty(openaiEndpointlUrl) ? defaultOpenaiUrl : openaiEndpointlUrl,
      });
    }
  }, [
    selectedModelType,
    huggingFaceApiKey,
    huggingFaceModelUrl,
    cohereApiKey,
    cohereModelId,
    openaiApiKey,
    openaiModelId,
    openaiOrganizationId,
    openaiEndpointlUrl,
  ]);

  const renderForm = () => {
    if (selectedModelType === Service.huggingFace)
      return (
        <HuggingFaceForm
          apiKey={huggingFaceApiKey}
          setApiKey={setHuggingFaceApiKey}
          url={huggingFaceModelUrl}
          setUrl={setHuggingFaceModelUrl}
        />
      );
    else if (selectedModelType === Service.cohere)
      return (
        <CohereForm
          apiKey={cohereApiKey}
          setApiKey={setCohereApiKey}
          modelId={cohereModelId}
          setModelId={setCohereModelId}
        />
      );
    else
      return (
        <OpenaiForm
          apiKey={openaiApiKey}
          setApiKey={setOpenaiApiKey}
          endpointUrl={openaiEndpointlUrl}
          setEndpointUrl={setOpenaiEndpointUrl}
          organizationId={openaiOrganizationId}
          setOrganizationId={openaiSetOrganizationId}
          modelId={openaiModelId}
          setModelId={setOpenaiModelId}
        />
      );
  };

  const InferenceSpecificComponent = (
    <>
      <EuiSuperSelect
        fullWidth
        data-test-subj="modelTypeSelect"
        options={connectToApiOptions}
        valueOfSelected={selectedModelType}
        onChange={(value) => onChangeModelType(value)}
      />
      {renderForm()}
    </>
  );

  return (
    <>
      <InferenceFlyout
        description={description}
        onSaveInferenceEndpoint={onSaveInferenceEndpoint}
        inferenceComponent={InferenceSpecificComponent}
        service={selectedModelType}
        modelConfig={modelConfig}
        areRequiredFieldsEmpty={areRequiredFieldsEmpty}
        isCreateInferenceApiLoading={isCreateInferenceApiLoading}
        onInferenceEndpointChange={onInferenceEndpointChange}
        inferenceEndpointError={inferenceEndpointError}
      />
    </>
  );
};
