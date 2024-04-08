/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  TabType,
  ElserServiceSettings,
  ModelConfig,
  HuggingFaceServiceSettings,
  OpenaiServiceSettings,
  CohereServiceSettings,
} from '../types';
import { Service, ElasticsearchModelDefaultOptions } from '../types';

export const elasticsearchModelsOptions: Array<
  EuiSuperSelectOption<ElasticsearchModelDefaultOptions>
> = [
  {
    value: ElasticsearchModelDefaultOptions.elser,
    inputDisplay: ElasticsearchModelDefaultOptions.elser,
    'data-test-subj': `serviceType-${ElasticsearchModelDefaultOptions.elser}`,
  },
  {
    value: ElasticsearchModelDefaultOptions.e5,
    inputDisplay: ElasticsearchModelDefaultOptions.e5,
    'data-test-subj': `serviceType-${ElasticsearchModelDefaultOptions.e5}`,
  },
];
export const connectToApiOptions: Array<EuiSuperSelectOption<Service>> = [
  {
    value: Service.huggingFace,
    inputDisplay: 'HuggingFace',
    'data-test-subj': 'serviceType-huggingFace',
  },
  {
    value: Service.cohere,
    inputDisplay: 'Cohere',
    'data-test-subj': 'serviceType-cohere',
  },
  {
    value: Service.openai,
    inputDisplay: 'Open Ai',
    'data-test-subj': 'serviceType-openAi',
  },
];

export const flyoutHeaderDescriptions: Record<TabType, { description: string }> = {
  elasticsearch_models: {
    description: i18n.translate(
      'xpack.ml.inferenceFlyoutWrapper.addInferenceEndpoint.elasticsearchModels.FlyoutHeaderdescription',
      {
        defaultMessage:
          'Connect to Elastic preferred models and models hosted on your elasticsearch nodes.',
      }
    ),
  },
  connect_to_api: {
    description: i18n.translate(
      'xpack.ml.inferenceFlyoutWrapper.addInferenceEndpoint.connect_to_api.FlyoutHeaderdescription',
      {
        defaultMessage: 'Connect to your preferred model service endpoints.',
      }
    ),
  },
  eland_python_client: {
    description: i18n.translate(
      'xpack.ml.inferenceFlyoutWrapper.addInferenceEndpoint.eland_python_client.FlyoutHeaderdescription',
      {
        defaultMessage: 'Import custom models through the Elastic python client.',
      }
    ),
  },
};

export const serviceTypeMap: Record<Service, InferenceTaskType> = {
  [Service.cohere]: 'text_embedding',
  [Service.huggingFace]: 'text_embedding',
  [Service.openai]: 'text_embedding',
  [Service.elasticsearch]: 'text_embedding',
  [Service.elser]: 'sparse_embedding',
};

export const setModalConfigResponse = (
  serviceType: Service,
  serviceSettings:
    | ElserServiceSettings
    | HuggingFaceServiceSettings
    | OpenaiServiceSettings
    | CohereServiceSettings
): ModelConfig => {
  return {
    service: serviceType,
    service_settings: serviceSettings,
  };
};
export const isFieldEmpty = (field: string) => {
  return field.trim() === '';
};
