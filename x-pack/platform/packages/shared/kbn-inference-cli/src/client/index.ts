/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BoundInferenceClient } from '@kbn/inference-common';
import { InferenceChatModel } from '@kbn/inference-langchain';

export interface InferenceCliClient extends BoundInferenceClient {
  getLangChainChatModel: () => InferenceChatModel;
}
