/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type OpenAI from 'openai';
import { Readable } from 'stream';
import { Plugin, CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

interface GenAiStreamingResponseExamplePluginStart {
  actions: ActionsPluginStart;
}

interface Message {
  role: string;
  content: string;
}

interface MessageBody {
  model?: string;
  messages: Message[];
}

export class GenAiStreamingResponseExamplePlugin implements Plugin<void, void> {
  public setup({ http, getStartServices }: CoreSetup<GenAiStreamingResponseExamplePluginStart>) {
    const router = http.createRouter();

    router.get(
      {
        path: `/internal/examples/get_gen_ai_connectors`,
        validate: {},
      },
      async (_, request, response) => {
        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);

        const allConnectors = await actionsClient.getAll();

        return response.ok({
          body: (allConnectors ?? []).filter(
            (connector) => connector.actionTypeId === '.gen-ai' && !connector.isPreconfigured
          ),
        });
      }
    );

    router.post(
      {
        path: `/internal/examples/execute_gen_ai_connector`,
        validate: {
          body: schema.object({
            connector_id: schema.string(),
            prompt: schema.string(),
          }),
        },
      },
      async (_, request, response) => {
        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);

        const connector = await actionsClient.get({ id: request.body.connector_id });

        let messageBody: MessageBody;
        if (connector.config?.apiProvider === 'OpenAI') {
          messageBody = {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: request.body.prompt,
              },
            ],
          };
        } else if (connector.config?.apiProvider === 'Azure OpenAI') {
          messageBody = {
            messages: [
              {
                role: 'user',
                content: request.body.prompt,
              },
            ],
          };
        } else {
          throw Boom.badRequest(
            `Invalid OpenAI connector selected - ${connector.config?.apiProvider} is not a valid provider`
          );
        }

        const executeResult = await actionsClient.execute({
          actionId: request.body.connector_id,
          params: {
            subAction: 'stream',
            subActionParams: {
              body: JSON.stringify(messageBody),
              stream: true,
            },
          },
        });

        if (executeResult?.status === 'error') {
          return response.customError({
            statusCode: 500,
            body: {
              message: `${executeResult?.message} - ${executeResult?.serviceMessage}`,
            },
          });
        }

        return response.ok({
          body: executeResult.data as OpenAI.ChatCompletion | Readable,
        });
      }
    );
  }

  public start() {}
  public stop() {}
}
