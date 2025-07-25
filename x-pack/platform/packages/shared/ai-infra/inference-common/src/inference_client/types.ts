/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundChatCompleteAPI, ChatCompleteAPI } from '../chat_complete';
import { InferenceConnector } from '../connectors';
import { BoundOutputAPI, OutputAPI } from '../output';
import { BoundPromptAPI, PromptAPI } from '../prompt';
import { BoundOptions } from '../bind';

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
   * `prompt` allows the consumer to pass model-specific prompts
   * which the inference plugin will match against the used model
   * and execute the most appropriate version.
   */
  prompt: PromptAPI;
  /**
   * `getConnectorById` returns an inference connector by id.
   * Non-inference connectors will throw an error.
   */
  getConnectorById: (id: string) => Promise<InferenceConnector>;
  /**
   * Create a {@link BoundInferenceClient}.
   */
  bindTo: (options: BoundOptions) => BoundInferenceClient;
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
   * `prompt` allows the consumer to pass model-specific prompts
   * which the inference plugin will match against the used model
   * and execute the most appropriate version.
   */
  prompt: BoundPromptAPI;
  /**
   * `getConnectorById` returns an inference connector by id.
   * Non-inference connectors will throw an error.
   */
  getConnectorById: (id: string) => Promise<InferenceConnector>;
  /**
   * Create a {@link BoundInferenceClient}.
   */
  bindTo: (options: BoundOptions) => BoundInferenceClient;
}
