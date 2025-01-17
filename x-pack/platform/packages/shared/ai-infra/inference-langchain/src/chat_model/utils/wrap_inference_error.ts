/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const wrapInferenceError = (error: any) => {
  // TODO: actually wrap the error
  // https://github.com/langchain-ai/langchainjs/blob/ff0dc580a71268b098e5ac2ee68b7d98317727ed/libs/langchain-openai/src/utils/openai.ts
  // https://github.com/langchain-ai/langchainjs/blob/ff0dc580a71268b098e5ac2ee68b7d98317727ed/libs/langchain-anthropic/src/utils/errors.ts
  return error;
};
