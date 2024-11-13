/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BedrockRuntimeClient as _BedrockRuntimeClient,
  BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { Readable } from 'stream';

export interface CustomChatModelInput extends BedrockRuntimeClientConfig {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  model: string;
  streaming?: boolean;
  temperature?: number;
  maxTokens?: number;
  anthropicVersion?: string;
}
export class BedrockRuntimeClient extends _BedrockRuntimeClient {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  streaming: boolean;
  temperature?: number;
  maxTokens?: number;
  anthropicVersion?: string;
  constructor({ actionsClient, connectorId, logger, ...fields }: CustomChatModelInput) {
    super(fields ?? {});
    this.streaming = fields.streaming ?? true;
    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    this.logger = logger;
    this.temperature = fields.temperature;
    this.maxTokens = fields.maxTokens;
    this.anthropicVersion = fields.anthropicVersion;
  }
  public async send({ input }, options) {
    const messages = prepareMessages(input.messages);
    console.log(
      'subactionparams',
      JSON.stringify(
        {
          ...input,
          messages,
        },
        null,
        2
      )
    );
    if (this.streaming) {
      const data = (await this.actionsClient.execute({
        actionId: this.connectorId,
        params: {
          subAction: 'converseStream',
          subActionParams: {
            ...input,
            messages,
          },
        },
      })) as { data: Readable; status: string; message?: string; serviceMessage?: string };

      console.log('stream here', data);
      if (data.status === 'error') {
        throw new Error(
          `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
        );
      }

      return {
        stream: Readable.toWeb(data.data),
      } as unknown as Response;
    }

    const data = (await this.actionsClient.execute({
      actionId: this.connectorId,
      params: {
        subAction: 'converse',
        subActionParams: {
          ...input,
          messages,
        },
      },
    })) as {
      status: string;
      data: { message: string };
      message?: string;
      serviceMessage?: string;
    };

    if (data.status === 'error') {
      throw new Error(
        `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
      );
    }
    console.log('ACTIONSRESPONSE', JSON.stringify(data, null, 2));

    return {
      ok: data.status === 'ok',
      ...data.data,
    } as unknown as Response;
  }
}

const prepareMessages = (messages: Array<{ role: string; content: string[] }>) =>
  messages.reduce((acc, { role, content }) => {
    const lastMessage = acc[acc.length - 1];

    if (!lastMessage || lastMessage.role !== role) {
      acc.push({ role, content });
      return acc;
    }

    if (lastMessage.role === role) {
      acc[acc.length - 1].content = lastMessage.content.concat(content);
      return acc;
    }

    return acc;
  }, [] as Array<{ role: string; content: string[] }>);
