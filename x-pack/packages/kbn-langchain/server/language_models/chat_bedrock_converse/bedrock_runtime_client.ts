/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IterableReadableStream } from '@langchain/core/utils/stream';
import {
  BedrockRuntimeClient as _BedrockRuntimeClient,
  BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { Readable } from 'stream';
import { de_ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime/dist-types/protocols/Aws_restJson1';
import { parseBedrockStreamAsAsyncIterator } from '../../utils/bedrock';

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
  public async send(command, options) {
    const { input } = command;
    const messages = prepareMessages(input.messages);
    const logger = this.logger;
    console.log('wutthis', this);

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

      if (data.status === 'error') {
        throw new Error(
          `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
        );
      }
      //
      // for await (const token of parseBedrockStreamAsAsyncIterator(readable)) {
      //   console.log('parseToken', token);
      //   yield token;
      // }
      // const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);
      de_ConverseStreamCommand(data.data, this.config);
      const parsedStream = async function* () {
        for await (const token of parseBedrockStreamAsAsyncIterator(
          data.data,
          logger,
          options?.signal,
          'converse'
        )) {
          console.log('parseToken', token);
          yield JSON.parse(token);
        }
        // const bedrockChunk = handleBedrockChunk({
        //   chunk,
        //   bedrockBuffer: new Uint8Array(0),
        //   logger: () => {},
        // });
        // const decodedChunk = awsDecoder.decode(chunk);
        // console.log('bedrockChunk decodedChunk', decodedChunk);
        // const event = JSON.parse(new TextDecoder().decode(decodedChunk.body));
        // console.log('bedrockChunk event', event);
        // yield event;
      };

      return {
        stream: IterableReadableStream.fromAsyncGenerator(parsedStream()),
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
