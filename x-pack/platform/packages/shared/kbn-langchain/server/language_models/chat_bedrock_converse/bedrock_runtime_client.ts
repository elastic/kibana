/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BedrockRuntimeClient as _BedrockRuntimeClient,
  BedrockRuntimeClientConfig,
  ConverseCommand,
  ConverseResponse,
  ConverseStreamCommand,
  ConverseStreamResponse,
} from '@aws-sdk/client-bedrock-runtime';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { constructStack } from '@smithy/middleware-stack';
import { HttpHandlerOptions } from '@smithy/types';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { prepareMessages } from '../../utils/bedrock';

export interface CustomChatModelInput extends BedrockRuntimeClientConfig {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  streaming?: boolean;
  telemetryMetadata?: TelemetryMetadata;
}

export class BedrockRuntimeClient extends _BedrockRuntimeClient {
  middlewareStack: _BedrockRuntimeClient['middlewareStack'];
  streaming: boolean;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  telemetryMetadata?: TelemetryMetadata;

  constructor({ actionsClient, connectorId, ...fields }: CustomChatModelInput) {
    super(fields ?? {});
    this.streaming = fields.streaming ?? true;
    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    this.telemetryMetadata = fields?.telemetryMetadata;
    // eliminate middleware steps that handle auth as Kibana connector handles auth
    this.middlewareStack = constructStack() as _BedrockRuntimeClient['middlewareStack'];
  }

  public async send(
    command: ConverseCommand | ConverseStreamCommand,
    optionsOrCb?: HttpHandlerOptions | ((err: unknown, data: unknown) => void)
  ) {
    const options = typeof optionsOrCb !== 'function' ? optionsOrCb : {};
    if (command.input.messages) {
      // without this, our human + human messages do not work and result in error:
      // A conversation must alternate between user and assistant roles.
      command.input.messages = prepareMessages(command.input.messages);
    }
    const data = (await this.actionsClient.execute({
      actionId: this.connectorId,
      params: {
        subAction: 'bedrockClientSend',
        subActionParams: {
          telemetryMetadata: this.telemetryMetadata,
          command,
          signal: options?.abortSignal,
        },
      },
    })) as {
      data: ConverseResponse | ConverseStreamResponse;
      status: string;
      message?: string;
      serviceMessage?: string;
    };

    if (data.status === 'error') {
      throw new Error(
        `ActionsClient BedrockRuntimeClient: action result status is error: ${data?.message} - ${data?.serviceMessage}`
      );
    }

    return data.data;
  }
}
