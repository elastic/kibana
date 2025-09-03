/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';

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

const PRECONFIGURED_INFERENCE_ENDPOINT_METADATA: Record<
  string,
  { title: string; description: string }
> = {
  [ELSER_ON_ML_NODE_INFERENCE_ID]: {
    title: elserTitle,
    description: elserDescription,
  },
  [E5_SMALL_INFERENCE_ID]: {
    title: e5SmallTitle,
    description: e5SmallDescription,
  },
};

export const getModelOptionsForInferenceEndpoints = ({
  endpoints,
}: {
  endpoints: InferenceAPIConfigResponse[];
}): ModelOptionsData[] => {
  return endpoints
    .filter((endpoint) => {
      // Only include preconfigured endpoints and skip custom endpoints
      return Boolean(PRECONFIGURED_INFERENCE_ENDPOINT_METADATA[endpoint.inference_id]);
    })
    .map((endpoint) => {
      const meta = PRECONFIGURED_INFERENCE_ENDPOINT_METADATA[endpoint.inference_id]!;

      return {
        key: endpoint.inference_id,
        label: meta.title,
        description: meta.description,
      };
    });
};
