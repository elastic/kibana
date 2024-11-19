/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeHttpHandler as _NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { HttpHandlerOptions, NodeHttpHandlerOptions } from '@smithy/types';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Readable } from 'stream';
import { fromUtf8 } from '@smithy/util-utf8';
import { ConverseResponse } from '@aws-sdk/client-bedrock-runtime';
import { prepareMessages } from '../../utils/bedrock';

interface NodeHandlerOptions extends NodeHttpHandlerOptions {
  streaming: boolean;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
}

export class NodeHttpHandler extends _NodeHttpHandler {
  streaming: boolean;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  constructor(options: NodeHandlerOptions) {
    super(options);
    this.streaming = options.streaming;
    this.actionsClient = options.actionsClient;
    this.connectorId = options.connectorId;
  }

  async handle(
    request: HttpRequest,
    options: HttpHandlerOptions = {}
  ): Promise<{ response: HttpResponse }> {
    const body = JSON.parse(request.body);
    const messages = prepareMessages(body.messages);

    if (this.streaming) {
      const data = (await this.actionsClient.execute({
        actionId: this.connectorId,
        params: {
          subAction: 'converseStream',
          subActionParams: { ...body, messages, signal: options.abortSignal },
        },
      })) as { data: Readable; status: string; message?: string; serviceMessage?: string };

      if (data.status === 'error') {
        throw new Error(
          `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
        );
      }

      return {
        response: {
          statusCode: 200,
          headers: {},
          body: data.data,
        },
      };
    }

    const data = (await this.actionsClient.execute({
      actionId: this.connectorId,
      params: {
        subAction: 'converse',
        subActionParams: { ...body, messages, signal: options.abortSignal },
      },
    })) as { data: ConverseResponse; status: string; message?: string; serviceMessage?: string };

    if (data.status === 'error') {
      throw new Error(
        `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
      );
    }

    return {
      response: {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: fromUtf8(JSON.stringify(data.data)),
      },
    };
  }
}
