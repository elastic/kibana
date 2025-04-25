/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export interface ModelOptionsData {
  key: string;
  label: string;
  description: string;
}

export const elserTitle = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.elserTitle',
  {
    defaultMessage: 'ELSER v2 (English-only)',
  }
);

export const elserDescription = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.elserDescription',
  {
    defaultMessage:
      'Focus on query meaning, not just keyword matching, using learned associations between terms. It delivers more relevant, context-aware results and works out of the box with no need for deep machine learning expertise.',
  }
);

export const e5SmallTitle = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.e5smallTitle',
  {
    defaultMessage: 'E5-small (multilingual)',
  }
);

export const e5SmallDescription = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.e5smallDescription',
  {
    defaultMessage:
      'E5 is an NLP model by Elastic designed to enhance multilingual semantic search by focusing on query context rather than keywords. E5-small is a cross-platform version compatible with different hardware configurations.',
  }
);

const e5LargeTitle = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.e5largeTitle',
  {
    defaultMessage: 'E5-large (multilingual)',
  }
);

const e5LargeDescription = i18n.translate(
  'xpack.aiAssistant.welcomeMessage.knowledgeBase.model.e5largeDescription',
  {
    defaultMessage:
      'E5 is an NLP model by Elastic designed to enhance multilingual semantic search by focusing on query context rather than keywords. E5-large is an optimized version for Intel® silicon.',
  }
);

const PRECONFIGURED_INFERENCE_ENDPOINT_METADATA: Record<
  string,
  { title: string; description: string }
> = {
  '.elser-2-elasticsearch': {
    title: elserTitle,
    description: elserDescription,
  },
  '.elser-v2-elastic': {
    title: elserTitle,
    description: elserDescription,
  },
  '.multilingual-e5-small-elasticsearch': {
    title: e5SmallTitle,
    description: e5SmallDescription,
  },
  '.multilingual-e5-large-elasticsearch': {
    title: e5LargeTitle,
    description: e5LargeDescription,
  },
};

export const getModelOptionsForInferenceEndpoints = ({
  endpoints,
}: {
  endpoints: InferenceAPIConfigResponse[];
}): ModelOptionsData[] => {
  // TODO: add logic to show the EIS models if EIS is enabled, if not show the other models
  return endpoints.map((endpoint) => {
    const meta = PRECONFIGURED_INFERENCE_ENDPOINT_METADATA[endpoint.inference_id] || {
      title: endpoint.inference_id,
      description: '',
    };

    return {
      key: endpoint.inference_id,
      label: meta.title,
      description: meta.description,
    };
  });
};
