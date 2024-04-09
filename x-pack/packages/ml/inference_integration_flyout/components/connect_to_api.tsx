/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSuperSelect } from '@elastic/eui';

import React, { useMemo, useState } from 'react';
import { connectToApiOptions, isFieldEmpty, setModalConfigResponse } from '../lib/shared_values';
import type { ModelConfig } from '../types';
import { Service } from '../types';
import { InferenceFlyout } from './flyout_layout';
import type { SaveMappingOnClick } from './inference_flyout_wrapper';
import { CohereForm } from './service_forms/cohere_form';
import { HuggingFaceForm } from './service_forms/huggingface_form';
import { OpenaiForm } from './service_forms/openai_form';

interface Props extends SaveMappingOnClick {
  description: string;
}
export const ConnectToApi: React.FC<Props> = ({ description, onSaveInferenceEndpoint }) => {
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
  const isSaveButtonEmpty = useMemo(() => {
    if (selectedModelType === Service.huggingFace) {
      return isFieldEmpty(huggingFaceModelUrl) || isFieldEmpty(huggingFaceApiKey);
    } else if (selectedModelType === Service.cohere) {
      return isFieldEmpty(cohereApiKey);
    } else {
      // open ai
      return isFieldEmpty(openaiApiKey);
    }
  }, [selectedModelType, huggingFaceModelUrl, huggingFaceApiKey, cohereApiKey, openaiApiKey]);

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
        model_id: isFieldEmpty(cohereModelId) ? defaultCohereModelId : cohereModelId,
      });
    } else {
      return setModalConfigResponse(Service.openai, {
        api_key: openaiApiKey,
        model_id: isFieldEmpty(openaiModelId) ? undefined : openaiModelId,
        organization_id: isFieldEmpty(openaiOrganizationId) ? undefined : openaiOrganizationId,
        url: isFieldEmpty(openaiEndpointlUrl) ? defaultOpenaiUrl : openaiEndpointlUrl,
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
        isSaveButtonEmpty={isSaveButtonEmpty}
      />
    </>
  );
};
