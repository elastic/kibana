/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundChatCompleteAPI,
  ChatCompleteAPI,
  BoundOutputAPI,
  OutputAPI,
} from '@kbn/inference-common';
import type { InferenceConnector } from '../../common/connectors';

/**
 * An inference client, scoped to a request, that can be used to interact with LLMs.
 */
export interface InferenceClient {
  /**
   * `chatComplete` requests the LLM to generate a response to
   * a prompt or conversation, which might be plain text
   * or a tool call, or a combination of both.
   */
  chatComplete: ChatCompleteAPI;
  /**
   * `output` asks the LLM to generate a structured (JSON)
   * response based on a schema and a prompt or conversation.
   */
  output: OutputAPI;
  /**
   * `getConnectorById` returns an inference connector by id.
   * Non-inference connectors will throw an error.
   */
  getConnectorById: (id: string) => Promise<InferenceConnector>;
}

/**
 * A version of the {@link InferenceClient} that is pre-bound to a set of parameters.
 */
export interface BoundInferenceClient {
  /**
   * `chatComplete` requests the LLM to generate a response to
   * a prompt or conversation, which might be plain text
   * or a tool call, or a combination of both.
   */
  chatComplete: BoundChatCompleteAPI;
  /**
   * `output` asks the LLM to generate a structured (JSON)
   * response based on a schema and a prompt or conversation.
   */
  output: BoundOutputAPI;
  /**
   * `getConnectorById` returns an inference connector by id.
   * Non-inference connectors will throw an error.
   */
  getConnectorById: (id: string) => Promise<InferenceConnector>;
}
