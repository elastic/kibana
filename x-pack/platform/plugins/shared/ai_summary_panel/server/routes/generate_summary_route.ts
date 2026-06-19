/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { normalizeColumnName } from '../../common/utils';
import { runEsqlQuery, sanitizeCellValue } from '../utils/esql_query';

const SOCKET_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_HTML_BYTES = 500_000;
const SAMPLE_ROWS = 3;

const SYSTEM_PROMPT = `You are a business intelligence analyst embedded in a Kibana dashboard.

Generate a reusable HTML summary using Liquid template syntax. The summary is filled with live ES|QL query results at render time — use conditional logic so the narrative adapts to the actual values.

DATA MODEL:
- panels.{key}.title: panel title string
- panels.{key}.rows: array of row objects (column names normalized: dots/special chars → underscores)
- panels.{key}.rows[0].col_name: first row value for that column
- panels.{key}.rows.size: number of rows returned
- panels.{key}.max.col_name: max value across all rows for that column

LIQUID SYNTAX:
- Loop: {% for row in panels.key.rows %}...{% endfor %}
- Conditional: {% if panels.key.rows[0].col >= 1000 %}...{% elsif ... %}...{% else %}...{% endif %}
- Output value: {{ panels.key.rows[0].col_name }}
- Filters: {{ value | round: 0 }}, {{ value | times: 100 | round }}%

REQUIRED: Your output MUST begin with exactly this comment on the very first line (nothing before it):
<!--ai-template-->

OUTPUT RULES:
- Output ONLY the HTML template starting with <!--ai-template-->. No markdown fences, no explanation.
- All CSS inline in <style> tags.
- No <script> tags, no JavaScript, no <a> anchor tags, no external resources.
- Pure HTML + CSS only.

VISUAL DESIGN:
- Body background transparent. Text: #343741.
- body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: #343741; }
- Accent colors: #0077CC, #00BFB3, #F04E98, #FEC514. Polished, modern style.

CONTENT:
- Highlight 2–4 key insights across the dashboard panels.
- Use conditional logic to surface warnings or positive signals based on actual values.
- Flag anything that needs attention.
- Concise: 3–5 short paragraphs or a card-based layout. No title needed.`;

interface StartDeps {
  inference: InferenceServerStart;
}

export function registerGenerateSummaryRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices']
) {
  router.post(
    {
      path: '/internal/ai_summary_panel/generate_summary',
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: SOCKET_TIMEOUT_MS },
      },
      validate: {
        body: schema.object({
          panels: schema.arrayOf(
            schema.object({
              title: schema.string(),
              key: schema.string(),
              esqlQuery: schema.string({ maxLength: 10_000 }),
            }),
            { minSize: 1, maxSize: 20 }
          ),
          timeRange: schema.maybe(schema.object({ from: schema.string(), to: schema.string() })),
          customInstructions: schema.maybe(schema.string({ maxLength: 2_000 })),
        }),
      },
    },
    async (context, request, response) => {
      const [, { inference }] = await getStartServices();
      const { panels, timeRange, customInstructions } = request.body;
      const core = await context.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      const connectorId = await inference.getDefaultConnector(request).then(
        (c) => c?.connectorId,
        () => undefined
      );
      if (!connectorId) {
        return response.badRequest({ body: 'No inference connector configured' });
      }

      // Run all panel queries in parallel to get column schemas + sample rows.
      // Failures are swallowed per-panel so one bad query doesn't block the others.
      const panelResults = await Promise.all(
        panels.map(async (panel) => {
          try {
            const { columns, rows } = await runEsqlQuery(esClient, panel.esqlQuery, timeRange);
            return { ...panel, columns, rows: rows.slice(0, SAMPLE_ROWS) };
          } catch {
            return { ...panel, columns: [], rows: [] };
          }
        })
      );

      // Build schema description for LLM (column names + types + sample rows)
      const schemaLines = panelResults
        .map((r, i) => {
          const { title, key, columns, rows } = r;
          if (columns.length === 0) return null;
          const colDesc = columns
            .map(
              (c) => `${c.name} (${c.type}) → panels.${key}.rows[n].${normalizeColumnName(c.name)}`
            )
            .join(', ');
          const sampleRow =
            rows.length > 0
              ? `Sample: ${rows[0]
                  .map(
                    (v, j) =>
                      `${normalizeColumnName(columns[j]?.name ?? '')}=${sanitizeCellValue(v)}`
                  )
                  .join(', ')}`
              : 'No rows available';
          return `Panel ${i + 1}: "${title}" (key: ${key})\n  Columns: ${colDesc}\n  ${sampleRow}`;
        })
        .filter(Boolean)
        .join('\n\n');

      const userMessage = [
        customInstructions || 'Summarize the key insights from this dashboard.',
        '',
        'Dashboard panels:',
        schemaLines || 'No panel data available.',
        '',
        'Generate an HTML summary template using the Liquid syntax described in the system prompt.',
      ].join('\n');

      const passThrough = new PassThrough();
      const abortController = new AbortController();
      const abortSub = request.events.aborted$.subscribe(() => abortController.abort());

      const client = inference.getClient({ request });
      const events$ = client.chatComplete({
        connectorId,
        system: SYSTEM_PROMPT,
        messages: [{ role: MessageRole.User, content: userMessage }],
        stream: true,
        abortSignal: abortController.signal,
      });

      let accHtml = '';
      let sizeLimitExceeded = false;
      events$.subscribe({
        next: (event) => {
          if (sizeLimitExceeded) return;
          if (event.type === ChatCompletionEventType.ChatCompletionChunk && event.content) {
            accHtml += event.content;
            if (accHtml.length > MAX_HTML_BYTES) {
              sizeLimitExceeded = true;
              abortController.abort();
              abortSub.unsubscribe();
              if (!passThrough.writableEnded) {
                passThrough.write(
                  JSON.stringify({ error: 'Generated content exceeded size limit' }) + '\n'
                );
                passThrough.end();
              }
              return;
            }
            if (!passThrough.writableEnded)
              passThrough.write(JSON.stringify({ token: event.content }) + '\n');
          }
        },
        error: (err) => {
          abortController.abort();
          abortSub.unsubscribe();
          if (!passThrough.writableEnded) {
            passThrough.write(JSON.stringify({ error: err.message }) + '\n');
            passThrough.end();
          }
        },
        complete: () => {
          abortSub.unsubscribe();
          if (sizeLimitExceeded) return;
          if (!passThrough.writableEnded) passThrough.end();
        },
      });

      return response.ok({
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: passThrough,
      });
    }
  );
}
