/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiHighlight } from '@elastic/eui';
import React from 'react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import {
  KIBANA_OBSERVABILITY_PROJECT,
  KIBANA_SECURITY_PROJECT,
  KIBANA_SEARCH_PROJECT,
} from '@kbn/projects-solutions-groups';

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
import amazonSageMakerIcon from '../assets/images/amazon_sagemaker_monochrome.svg';
import anthropicIcon from '../assets/images/anthropic.svg';
import alibabaCloudIcon from '../assets/images/alibaba_cloud.svg';
import ibmWatsonxIcon from '../assets/images/ibm_watsonx.svg';
import jinaAIIcon from '../assets/images/jinaai.svg';
import voyageAIIcon from '../assets/images/voyageai.svg';
import deepSeekIcon from '../assets/images/deepseek.svg';
import ai21Icon from '../assets/images/ai21_labs_default.svg';
import llamaIcon from '../assets/images/llama_stack_default.svg';
import defaultIcon from '../assets/images/default_connector_icon.svg';
import contextualAiIcon from '../assets/images/contextual_ai_icon.svg';
import groqIcon from '../assets/images/grok.svg';

interface ServiceProviderProps {
  providerKey: ServiceProviderKeys;
  searchValue?: string;
}

type SolutionKeys = Partial<{
  [key in SolutionView]: string;
}>;

export const solutionKeys: SolutionKeys = {
  [KIBANA_OBSERVABILITY_PROJECT]: 'Observability',
  [KIBANA_SECURITY_PROJECT]: 'Security',
  [KIBANA_SEARCH_PROJECT]: 'Search',
};

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
  [ServiceProviderKeys.amazon_sagemaker]: {
    icon: amazonSageMakerIcon,
    name: 'Amazon SageMaker',
    solutions: ['Search'],
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
  [ServiceProviderKeys.contextualai]: {
    icon: contextualAiIcon,
    name: 'Contextual AI',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elasticsearch]: {
    icon: elasticIcon,
    name: 'Elasticsearch',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elastic]: {
    icon: elasticIcon,
    name: 'Elastic Inference Service',
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
  [ServiceProviderKeys.voyageai]: {
    icon: voyageAIIcon,
    name: 'Voyage AI',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.deepseek]: {
    icon: deepSeekIcon,
    name: 'DeepSeek',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.ai21]: {
    icon: ai21Icon,
    name: 'AI21 labs',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.llama]: {
    icon: llamaIcon,
    name: 'Llama Stack',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.groq]: {
    icon: groqIcon,
    name: 'Groq',
    solutions: ['Observability', 'Security', 'Search'],
  },
};

export const ServiceProviderIcon: React.FC<ServiceProviderProps> = ({ providerKey }) => {
  const provider = SERVICE_PROVIDERS[providerKey];
  const iconType = provider ? provider.icon : defaultIcon;

  return (
    <EuiAvatar
      name={providerKey}
      data-test-subj={`icon-service-provider-${providerKey}`}
      iconType={iconType}
      color="#fff"
      size="s"
      type="space"
    />
  );
};

export const ServiceProviderName: React.FC<ServiceProviderProps> = ({
  providerKey,
  searchValue,
}) => {
  const provider = SERVICE_PROVIDERS[providerKey];
  const providerName = provider ? provider.name : providerKey;

  return (
    <EuiHighlight data-test-subj={`${providerName}-provider`} search={searchValue ?? ''}>
      {providerName}
    </EuiHighlight>
  );
};
