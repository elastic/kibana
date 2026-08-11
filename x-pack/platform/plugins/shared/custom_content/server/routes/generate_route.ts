/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { ServerSentEventError } from '@kbn/sse-utils';
import type { ESQLColumn } from '@kbn/es-types';
import { getESQLResults, appendLimitToQuery } from '@kbn/esql-utils';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_ENABLED_FLAG_KEY,
  CUSTOM_CONTENT_GENERATE_ROUTE,
  CUSTOM_CONTENT_SAMPLE_ROW_COUNT,
} from '../../common/constants';
import type { CustomContentTokenEvent } from '../../common/types';
import {
  buildSystemPromptStatic,
  buildSystemPromptTemplate,
  formatSampleTable,
} from '../utils/prompts';

const SOCKET_TIMEOUT_MS = 5 * 60 * 1000;

interface StartDeps {
  inference: InferenceServerStart;
  data: DataPluginStart;
}

export function registerGenerateRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices'],
  logger: Logger
) {
  router.post(
    {
      path: CUSTOM_CONTENT_GENERATE_ROUTE,
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: SOCKET_TIMEOUT_MS },
      },
      validate: {
        body: schema.object({
          prompt: schema.maybe(
            schema.string({ minLength: 1, maxLength: CUSTOM_CONTENT_MAX_PROMPT_LENGTH })
          ),
          colorMode: schema.oneOf([schema.literal('LIGHT'), schema.literal('DARK')], {
            defaultValue: 'LIGHT',
          }),
          esqlQuery: schema.maybe(
            schema.string({ maxLength: CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH })
          ),
          timeRange: schema.maybe(
            schema.object({
              from: schema.string({ maxLength: 100 }),
              to: schema.string({ maxLength: 100 }),
              mode: schema.maybe(
                schema.oneOf([schema.literal('absolute'), schema.literal('relative')])
              ),
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const [coreStart, { inference, data }] = await getStartServices();
      // Temporary kill-switch — remove once the feature is approved to ship.
      if (!coreStart.featureFlags.getBooleanValue(CUSTOM_CONTENT_ENABLED_FLAG_KEY, false)) {
        return response.notFound();
      }

      const { prompt, colorMode, esqlQuery, timeRange } = request.body;

      if (!prompt && !esqlQuery) {
        return response.badRequest({
          body: i18n.translate('xpack.customContent.generateRoute.missingInputError', {
            defaultMessage: 'Either prompt or esqlQuery is required',
          }),
        });
      }

      const defaultConnector = await inference.getDefaultConnector(request).catch(() => null);
      const connector =
        defaultConnector ?? (await inference.getConnectorList(request).catch(() => []))[0] ?? null;

      let esqlColumns: ESQLColumn[] = [];
      let esqlValues: unknown[][] = [];
      if (esqlQuery) {
        try {
          const search = data.search.asScoped(request).search;
          const sampledQuery = appendLimitToQuery(esqlQuery, CUSTOM_CONTENT_SAMPLE_ROW_COUNT);
          const { response: esqlResponse } = await getESQLResults({
            search,
            esqlQuery: sampledQuery,
            timeRange,
          });
          esqlColumns = esqlResponse.columns as ESQLColumn[];
          esqlValues = esqlResponse.values as unknown[][];
        } catch {
          // Non-fatal — generate template from prompt + partial schema.
        }
      }

      let systemPrompt: string;
      let userContent: string;

      if (esqlQuery) {
        systemPrompt = buildSystemPromptTemplate(colorMode);

        const promptPrefix = prompt ? `${prompt}\n\n` : '';

        if (esqlColumns.length > 0) {
          // Column names must NOT be sanitized here — they must match the exact keys used in fillTemplate.
          const schemaLines = esqlColumns.map((c) => `  - ${c.name} (${c.type})`).join('\n');
          const sampleSection =
            esqlValues.length > 0
              ? `\n\nSample rows:\n${formatSampleTable(esqlColumns, esqlValues)}`
              : '\n\nNote: no rows available for the current time range.';
          userContent = `${promptPrefix}Data schema:\n${schemaLines}${sampleSection}\n\nGenerate an HTML template that accesses each column via bracket notation using its exact name, e.g. row["${esqlColumns[0].name}"].value.`;
        } else {
          userContent = `${promptPrefix}Note: schema unavailable. Generate a suitable template for this ES|QL query.`;
        }
      } else {
        systemPrompt = buildSystemPromptStatic(colorMode);
        userContent = prompt!;
      }

      const abortController = new AbortController();
      const abortSub = request.events.aborted$.subscribe(() => abortController.abort());

      const events$ = new Observable<CustomContentTokenEvent>((subscriber) => {
        if (!connector) {
          subscriber.error(
            new ServerSentEventError(
              'no_connector',
              i18n.translate('xpack.customContent.generateRoute.noConnectorError', {
                defaultMessage: 'No inference connector configured',
              }),
              {}
            )
          );
          return;
        }

        const { connectorId } = connector;
        const client = inference.getClient({ request });

        let accHtmlBytes = 0;

        const inferenceEvents$ = client.chatComplete({
          connectorId,
          system: systemPrompt,
          messages: [{ role: MessageRole.User, content: userContent }],
          stream: true,
          abortSignal: abortController.signal,
        });

        const sub = inferenceEvents$.subscribe({
          next: (event) => {
            if (event.type === ChatCompletionEventType.ChatCompletionChunk && event.content) {
              accHtmlBytes += Buffer.byteLength(event.content, 'utf8');
              if (accHtmlBytes > CUSTOM_CONTENT_MAX_TEMPLATE_BYTES) {
                abortController.abort();
                subscriber.error(
                  new ServerSentEventError(
                    'size_limit_exceeded',
                    i18n.translate('xpack.customContent.generateRoute.sizeLimitError', {
                      defaultMessage: 'Generated content exceeded size limit',
                    }),
                    {}
                  )
                );
                return;
              }
              subscriber.next({ type: 'token', token: event.content });
            }
          },
          error: (err) => {
            abortSub.unsubscribe();
            logger.error(`Custom content generation failed: ${err.message}`);
            subscriber.error(
              new ServerSentEventError(
                'generation_failed',
                i18n.translate('xpack.customContent.generateRoute.generationFailedError', {
                  defaultMessage: 'Custom content generation failed',
                }),
                {}
              )
            );
          },
          complete: () => {
            abortSub.unsubscribe();
            subscriber.complete();
          },
        });

        return () => sub.unsubscribe();
      });

      return response.ok({
        headers: { 'Content-Type': 'text/event-stream' },
        body: observableIntoEventSourceStream(events$, {
          signal: abortController.signal,
          logger,
        }),
      });
    }
  );
}
