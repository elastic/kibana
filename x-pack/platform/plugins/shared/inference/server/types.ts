/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  BoundInferenceClient,
  BoundOptions,
  InferenceClient,
  InferenceConnector,
} from '@kbn/inference-common';
import type { InferenceChatModel, InferenceChatModelParams } from '@kbn/inference-langchain';
import type { InferenceCallbackManager } from '@kbn/inference-common/src/chat_complete/api';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface InferenceSetupDependencies {
  actions: ActionsPluginSetup;
}

export interface InferenceStartDependencies {
  actions: ActionsPluginStart;
}

/**
 * Setup contract of the inference plugin.
 */
export interface InferenceServerSetup {}

/**
 * Options to create an inference client using the {@link InferenceServerStart.getClient} API.
 */
export interface InferenceUnboundClientCreateOptions {
  /**
   * The request to scope the client to.
   */
  request: KibanaRequest;
  /**
   * Callback manager to be used by the client to report lifecycle events.
   */
  callbackManager?: InferenceCallbackManager;
}

/**
 * Options to create a bound inference client using the {@link InferenceServerStart.getClient} API.
 */
export interface InferenceBoundClientCreateOptions extends InferenceUnboundClientCreateOptions {
  /**
   * The parameters to bind the client to.
   */
  bindTo: BoundOptions;
}

/**
 * Options to create an inference client using the {@link InferenceServerStart.getClient} API.
 */
export type InferenceClientCreateOptions =
  | InferenceUnboundClientCreateOptions
  | InferenceBoundClientCreateOptions;

/**
 * Start contract of the inference plugin, exposing APIs to interact with LLMs.
 */
export interface InferenceServerStart {
  /**
   * Creates an {@link InferenceClient}, scoped to a request.
   *
   * @example
   * ```ts
   * const inferenceClient = myStartDeps.inference.getClient({ request });
   *
   * const chatResponse = inferenceClient.chatComplete({
   *   connectorId: 'my-connector-id',
   *   messages: [{ role: MessageRole.User, content: 'Do something' }],
   * });
   * ```
   *
   * It is also possible to bind a client to its configuration parameters, to avoid passing connectorId
   * to every call, for example. Defining the `bindTo` parameter will return a {@link BoundInferenceClient}
   *
   * @example
   * ```ts
   * const inferenceClient = myStartDeps.inference.getClient({
   *   request,
   *   bindTo: {
   *    connectorId: 'my-connector-id',
   *    functionCalling: 'simulated',
   *   }
   * });
   *
   * const chatResponse = inferenceClient.chatComplete({
   *   messages: [{ role: MessageRole.User, content: 'Do something' }],
   * });
   * ```
   */
  getClient: <T extends InferenceClientCreateOptions>(
    options: T
  ) => T extends InferenceBoundClientCreateOptions ? BoundInferenceClient : InferenceClient;

  /**
   * Creates a langchain {@link InferenceChatModel} that will be using the inference framework
   * under the hood.
   *
   * @example
   * ```ts
   * const chatModel = await myStartDeps.inference.getChatModel({
   *   request,
   *   connectorId: 'my-connector-id',
   *   chatModelOptions: {
   *    temperature: 0.3,
   *   }
   * });
   */
  getChatModel: (options: CreateChatModelOptions) => Promise<InferenceChatModel>;

  /**
   * Returns a list of all available inference connectors.
   *
   * @param request - The Kibana request to scope the operation to
   * @returns A promise that resolves to an array of inference connectors
   */
  getConnectorList: (request: KibanaRequest) => Promise<InferenceConnector[]>;

  /**
   * Retrieves the default inference connector configured for the system.
   *
   * @param request - The Kibana request to scope the operation to
   * @returns A promise that resolves to the default inference connector
   */
  getDefaultConnector: (request: KibanaRequest) => Promise<InferenceConnector>;

  /**
   * Retrieves a specific inference connector by its ID.
   *
   * @param id - The unique identifier of the connector to retrieve
   * @param request - The Kibana request to scope the operation to
   * @returns A promise that resolves to the requested inference connector
   * @throws Error if the connector with the specified ID does not exist
   */
  getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}

/**
 * Options to create an inference chat model using the {@link InferenceServerStart.getChatModel} API.
 */
export interface CreateChatModelOptions {
  /**
   * The request to scope the client to.
   */
  request: KibanaRequest;
  /**
   * The id of the GenAI connector to use.
   */
  connectorId: string;
  /**
   * Additional parameters to be passed down to the model constructor.
   */
  chatModelOptions: Omit<InferenceChatModelParams, 'connector' | 'chatComplete' | 'logger'>;
}
