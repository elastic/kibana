/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AZURE_OPENAI_CHAT_URL,
  AZURE_OPENAI_COMPLETIONS_URL,
  AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL,
} from '@kbn/connector-schemas/openai';

const APIS_ALLOWING_STREAMING = new Set<string>([
  AZURE_OPENAI_CHAT_URL,
  AZURE_OPENAI_COMPLETIONS_URL,
  AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL,
]);

/**
 * Sanitizes the Azure Open AI request body to set stream to false
 * so users cannot specify a streaming response when the framework
 * is not prepared to handle streaming
 *
 * The stream parameter is only accepted in the Chat API, the Completion API
 * and the Completions Extensions API
 *
 * When defaultModel is provided and the body does not already specify a model,
 * it is injected into the body. This is required for Azure API Management (APIM)
 * or proxy endpoints that do not infer the model from the deployment URL.
 */
export const sanitizeRequest = (url: string, body: string, defaultModel?: string): string => {
  return getRequestWithStreamOption(url, body, false, defaultModel);
};

/**
 * Intercepts the Azure Open AI request body to set the stream parameter
 *
 * The stream parameter is only accepted in the Chat API, the Completion API
 * and the Completions Extensions API
 *
 * When defaultModel is provided and the body does not already specify a model,
 * it is injected into the body. This is required for Azure API Management (APIM)
 * or proxy endpoints that do not infer the model from the deployment URL.
 */
export const getRequestWithStreamOption = (
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string => {
  if (
    !Array.from(APIS_ALLOWING_STREAMING)
      .map((apiUrl: string) => transformApiUrlToRegex(apiUrl))
      .some((regex: RegExp) => url.match(regex) != null)
  ) {
    return body;
  }

  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      jsonBody.stream = stream;
      if (stream) {
        jsonBody.stream_options = {
          include_usage: true,
        };
      }
      if (defaultModel && !jsonBody.model) {
        jsonBody.model = defaultModel;
      }
    }

    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};

export const transformApiUrlToRegex = (apiUrl: string): RegExp => {
  return new RegExp(
    apiUrl
      .replaceAll(`/`, `\\/`)
      .replaceAll(`.`, `\\.`)
      .replace(`{your-resource-name}`, `[^\\.\\/]+`)
      .replace(`{deployment-id}`, `[^\\/]+`)
      .replace(`?api-version={api-version}`, ``),
    'g'
  );
};
