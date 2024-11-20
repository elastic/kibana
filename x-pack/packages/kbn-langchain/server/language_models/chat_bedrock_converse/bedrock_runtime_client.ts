/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BedrockRuntimeClient as _BedrockRuntimeClient,
  BedrockRuntimeClientConfig,
  ConverseResponse,
} from '@aws-sdk/client-bedrock-runtime';
import { constructStack } from '@smithy/middleware-stack';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { prepareMessages } from '../../utils/bedrock';
import { NodeHttpHandler } from './node_http_handler';

export interface CustomChatModelInput extends BedrockRuntimeClientConfig {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  streaming?: boolean;
}

export class BedrockRuntimeClient extends _BedrockRuntimeClient {
  middlewareStack: _BedrockRuntimeClient['middlewareStack'];
  streaming: boolean;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;

  constructor({ actionsClient, connectorId, ...fields }: CustomChatModelInput) {
    super(fields ?? {});
    this.config.requestHandler = new NodeHttpHandler({
      streaming: fields.streaming ?? true,
      actionsClient,
      connectorId,
    });
    this.streaming = fields.streaming ?? true;
    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    // eliminate middleware steps that handle auth as Kibana connector handles auth
    this.middlewareStack = constructStack() as _BedrockRuntimeClient['middlewareStack'];
  }

  public async send(command, optionsOrCb?: { abortSignal?: AbortSignal }) {
    const messages = prepareMessages(command.messages);

    const data = (await this.actionsClient.execute({
      actionId: this.connectorId,
      params: {
        subAction: 'converse',
        subActionParams: { ...command, messages, signal: optionsOrCb?.abortSignal },
      },
    })) as { data: ConverseResponse; status: string; message?: string; serviceMessage?: string };

    if (data.status === 'error') {
      throw new Error(
        `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
      );
    }

    return data.data;
  }
}
