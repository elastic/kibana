/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';

import type { Conversation, Message } from '../assistant_context/types';
import { API_ERROR } from './translations';
import { MODEL_GPT_3_5_TURBO } from '../connectorland/models/model_selector/model_selector';
import { getFormattedMessageContent } from './helpers';
import { PerformEvaluationParams } from './settings/evaluation_settings/use_post_evaluation';

export interface FetchConnectorExecuteAction {
  assistantLangChain: boolean;
  apiConfig: Conversation['apiConfig'];
  http: HttpSetup;
  messages: Message[];
  signal?: AbortSignal | undefined;
}

export const fetchConnectorExecuteAction = async ({
  assistantLangChain,
  http,
  messages,
  apiConfig,
  signal,
}: FetchConnectorExecuteAction): Promise<string> => {
  const outboundMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const body =
    apiConfig?.provider === OpenAiProviderType.OpenAi
      ? {
          model: apiConfig.model ?? MODEL_GPT_3_5_TURBO,
          messages: outboundMessages,
          n: 1,
          stop: null,
          temperature: 0.2,
        }
      : {
          messages: outboundMessages,
        };

  const requestBody = {
    params: {
      subActionParams: {
        body: JSON.stringify(body),
      },
      subAction: 'test',
    },
  };

  try {
    const path = assistantLangChain
      ? `/internal/elastic_assistant/actions/connector/${apiConfig?.connectorId}/_execute`
      : `/api/actions/connector/${apiConfig?.connectorId}/_execute`;

    // TODO: Find return type for this API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await http.fetch<any>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    const data = response.data;
    if (response.status !== 'ok') {
      return API_ERROR;
    }

    if (data.choices && data.choices.length > 0 && data.choices[0].message.content) {
      const result = data.choices[0].message.content.trim();

      return assistantLangChain ? getFormattedMessageContent(result) : result;
    } else {
      return API_ERROR;
    }
  } catch (error) {
    return API_ERROR;
  }
};

export interface GetKnowledgeBaseStatusParams {
  http: HttpSetup;
  resource?: string;
  signal?: AbortSignal | undefined;
}

export interface GetKnowledgeBaseStatusResponse {
  elser_exists: boolean;
  esql_exists?: boolean;
  index_exists: boolean;
  pipeline_exists: boolean;
}

/**
 * API call for getting the status of the Knowledge Base. Provide
 * a resource to include the status of that specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.resource] - Resource to get the status of, otherwise status of overall KB
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<GetKnowledgeBaseStatusResponse | IHttpFetchError>}
 */
export const getKnowledgeBaseStatus = async ({
  http,
  resource,
  signal,
}: GetKnowledgeBaseStatusParams): Promise<GetKnowledgeBaseStatusResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/knowledge_base/${resource || ''}`;
    const response = await http.fetch(path, {
      method: 'GET',
      signal,
    });

    return response as GetKnowledgeBaseStatusResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface PostKnowledgeBaseParams {
  http: HttpSetup;
  resource?: string;
  signal?: AbortSignal | undefined;
}

export interface PostKnowledgeBaseResponse {
  success: boolean;
}

/**
 * API call for setting up the Knowledge Base. Provide a resource to set up a specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.resource] - Resource to be added to the KB, otherwise sets up the base KB
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<PostKnowledgeBaseResponse | IHttpFetchError>}
 */
export const postKnowledgeBase = async ({
  http,
  resource,
  signal,
}: PostKnowledgeBaseParams): Promise<PostKnowledgeBaseResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/knowledge_base/${resource || ''}`;
    const response = await http.fetch(path, {
      method: 'POST',
      signal,
    });

    return response as PostKnowledgeBaseResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface DeleteKnowledgeBaseParams {
  http: HttpSetup;
  resource?: string;
  signal?: AbortSignal | undefined;
}

export interface DeleteKnowledgeBaseResponse {
  success: boolean;
}

/**
 * API call for deleting the Knowledge Base. Provide a resource to delete that specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.resource] - Resource to be deleted from the KB, otherwise delete the entire KB
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<DeleteKnowledgeBaseResponse | IHttpFetchError>}
 */
export const deleteKnowledgeBase = async ({
  http,
  resource,
  signal,
}: DeleteKnowledgeBaseParams): Promise<DeleteKnowledgeBaseResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/knowledge_base/${resource || ''}`;
    const response = await http.fetch(path, {
      method: 'DELETE',
      signal,
    });

    return response as DeleteKnowledgeBaseResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface PostEvaluationParams {
  http: HttpSetup;
  evalParams?: PerformEvaluationParams;
  signal?: AbortSignal | undefined;
}

export interface PostEvaluationResponse {
  success: boolean;
}

/**
 * API call for evaluating models.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.evalParams] - Params necessary for evaluation
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<PostEvaluationResponse | IHttpFetchError>}
 */
export const postEvaluation = async ({
  http,
  evalParams,
  signal,
}: PostEvaluationParams): Promise<PostEvaluationResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/evaluate`;
    const query = {
      models: evalParams?.models.sort()?.join(','),
      agents: evalParams?.agents.sort()?.join(','),
      evaluationType: evalParams?.evaluationType.sort()?.join(','),
      evalModel: evalParams?.evalModel.sort()?.join(','),
      outputIndex: evalParams?.outputIndex,
    };

    const response = await http.fetch(path, {
      method: 'POST',
      body: JSON.stringify({
        dataset: JSON.parse(evalParams?.dataset ?? '[]'),
        evalPrompt: evalParams?.evalPrompt ?? '',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      query,
      signal,
    });

    return response as PostEvaluationResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};
