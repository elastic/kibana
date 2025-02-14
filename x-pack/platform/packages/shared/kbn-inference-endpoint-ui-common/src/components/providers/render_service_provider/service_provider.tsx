/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHighlight, EuiIcon } from '@elastic/eui';
import React from 'react';

import { ServiceProviderKeys } from '../../../constants';
import elasticIcon from '../assets/images/elastic.svg';
import huggingFaceIcon from '../assets/images/hugging_face.svg';
import cohereIcon from '../assets/images/cohere.svg';
import openAIIcon from '../assets/images/open_ai.svg';
import azureAIStudioIcon from '../assets/images/azure_ai_studio.svg';
import azureOpenAIIcon from '../assets/images/azure_open_ai.svg';
import googleAIStudioIcon from '../assets/images/google_ai_studio.svg';
import mistralIcon from '../assets/images/mistral.svg';
import amazonBedrockIcon from '../assets/images/amazon_bedrock.svg';
import anthropicIcon from '../assets/images/anthropic.svg';
import alibabaCloudIcon from '../assets/images/alibaba_cloud.svg';
import ibmWatsonxIcon from '../assets/images/ibm_watsonx.svg';
import jinaAIIcon from '../assets/images/jinaai.svg';

interface ServiceProviderProps {
  providerKey: ServiceProviderKeys;
  searchValue?: string;
}

export type ProviderSolution = 'Observability' | 'Security' | 'Search';

interface ServiceProviderRecord {
  icon: string;
  name: string;
  solutions: ProviderSolution[];
}

export const SERVICE_PROVIDERS: Record<ServiceProviderKeys, ServiceProviderRecord> = {
  [ServiceProviderKeys.amazonbedrock]: {
    icon: amazonBedrockIcon,
    name: 'Amazon Bedrock',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.azureaistudio]: {
    icon: azureAIStudioIcon,
    name: 'Azure AI Studio',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.azureopenai]: {
    icon: azureOpenAIIcon,
    name: 'Azure OpenAI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.anthropic]: {
    icon: anthropicIcon,
    name: 'Anthropic',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.cohere]: {
    icon: cohereIcon,
    name: 'Cohere',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elasticsearch]: {
    icon: elasticIcon,
    name: 'Elasticsearch',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elastic]: {
    icon: elasticIcon,
    name: 'Elastic',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.googleaistudio]: {
    icon: googleAIStudioIcon,
    name: 'Google AI Studio',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.googlevertexai]: {
    icon: googleAIStudioIcon,
    name: 'Google Vertex AI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.hugging_face]: {
    icon: huggingFaceIcon,
    name: 'Hugging Face',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.mistral]: {
    icon: mistralIcon,
    name: 'Mistral',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.openai]: {
    icon: openAIIcon,
    name: 'OpenAI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys['alibabacloud-ai-search']]: {
    icon: alibabaCloudIcon,
    name: 'AlibabaCloud AI Search',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.watsonxai]: {
    icon: ibmWatsonxIcon,
    name: 'IBM Watsonx',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.jinaai]: {
    icon: jinaAIIcon,
    name: 'Jina AI',
    solutions: ['Search'],
  },
};

export const ServiceProviderIcon: React.FC<ServiceProviderProps> = ({ providerKey }) => {
  const provider = SERVICE_PROVIDERS[providerKey];

  return provider ? (
    <EuiIcon data-test-subj={`icon-service-provider-${providerKey}`} type={provider.icon} />
  ) : null;
};

export const ServiceProviderName: React.FC<ServiceProviderProps> = ({
  providerKey,
  searchValue,
}) => {
  const provider = SERVICE_PROVIDERS[providerKey];

  return provider ? (
    <EuiHighlight search={searchValue ?? ''}>{provider.name}</EuiHighlight>
  ) : (
    <span>{providerKey}</span>
  );
};
