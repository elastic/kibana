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
import dateMath from '@kbn/datemath';

const SOCKET_TIMEOUT_MS = 5 * 60 * 1000;

const SYSTEM_PROMPT = `You are a data visualization assistant embedded in a Kibana dashboard panel.

Your job is to generate a single self-contained HTML document that presents the user's data or answers their prompt in the most appropriate visual form.

OUTPUT RULES — follow these exactly:
- Output ONLY valid HTML. No markdown fences, no explanation, no commentary before or after.
- The HTML must be fully self-contained: all CSS inline in <style> tags.
- CRITICAL: Do NOT include ANY <script> tags or JavaScript whatsoever. No inline scripts, no external scripts, no event handlers. Pure HTML + CSS only.
- Do NOT load any external resources. No CDN scripts, no Google Fonts, no images from URLs.
- For charts and diagrams, use pure CSS (bar charts with div widths, progress bars, etc.) or inline SVG.

VISUAL DESIGN:
- Body background MUST be transparent — do NOT set any background color on <html> or <body>. The panel background is handled by the container.
- Text color: #343741 (dark gray). NEVER use #1a1a2e as a background — it is a text color only.
- Use clean, modern design. Comfortable padding. No harsh borders.
- Accent colors for data elements only: #0077CC (blue), #00BFB3 (teal), #F04E98 (pink), #FEC514 (yellow), #1BA9F5, #D36086.
- Make it look like a polished dashboard widget, not a raw HTML page.
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: #343741; }

CONTENT RULES:
- Pick the visualization type that best fits the data and the prompt. Do NOT default to charts when a table, list, KPI card, or status board is more appropriate.
- If data is provided, the values are already embedded in this prompt — render them directly as static HTML. Do not reference any JavaScript variables.
- Fill the full panel width. Height should fit the content naturally.
- Do not add a title — the dashboard panel has its own title.
- For bar charts: use a div with a colored background and width set to the percentage value inline style. Example: <div style="width: 42%; background: #0077CC; height: 20px;"></div>
- For status indicators: use colored badges/pills with CSS background-color.`;

function formatEsqlResultsAsTable(
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): string {
  const header = columns.map((c) => c.name).join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const rows = values
    .slice(0, 50)
    .map((row) => row.map((v) => String(v ?? '')).join(' | '))
    .join('\n');
  return `${header}\n${separator}\n${rows}`;
}

interface StartDeps {
  inference: InferenceServerStart;
}

export function registerGenerateRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices']
) {
  router.post(
    {
      path: '/internal/ai_summary_panel/generate',
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: SOCKET_TIMEOUT_MS },
      },
      validate: {
        body: schema.object({
          prompt: schema.string(),
          connectorId: schema.maybe(schema.string()),
          esqlQuery: schema.maybe(schema.string()),
          timeRange: schema.maybe(
            schema.object({ from: schema.string(), to: schema.string() })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const [, { inference }] = await getStartServices();
      const { prompt, connectorId: connectorIdFromBody, esqlQuery, timeRange } = request.body;
      const connectorId =
        connectorIdFromBody ||
        (await inference.getDefaultConnector(request))?.connectorId;
      if (!connectorId) {
        return response.badRequest({ body: 'No inference connector configured' });
      }

      const passThrough = new PassThrough();
      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => abortController.abort());

      let userMessage = prompt;

      if (esqlQuery) {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const esqlParams = timeRange
            ? [
                { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
                { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
              ]
            : undefined;
          const result = await esClient.asCurrentUser.esql.query({
            query: esqlQuery,
            ...(esqlParams ? { params: esqlParams } : {}),
          });
          const rows = result.values as unknown[][];
          if (rows.length > 0) {
            const table = formatEsqlResultsAsTable(
              result.columns as Array<{ name: string; type: string }>,
              rows
            );
            userMessage = `${prompt}\n\nData from ES|QL query (render these values directly into the HTML — do not use JavaScript):\n\n${table}`;
          } else {
            userMessage = `${prompt}\n\nNote: The ES|QL query returned no rows. Render a panel that clearly shows there is no data available yet, using a clean empty-state design.`;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          userMessage = `${prompt}\n\nNote: The ES|QL query failed (${msg}). Render a panel that clearly shows data is unavailable, with a brief explanation.`;
        }
      }

      const client = inference.getClient({ request });
      const events$ = client.chatComplete({
        connectorId,
        system: SYSTEM_PROMPT,
        messages: [{ role: MessageRole.User, content: userMessage }],
        stream: true,
        abortSignal: abortController.signal,
      });

      events$.subscribe({
        next: (event) => {
          if (event.type === ChatCompletionEventType.ChatCompletionChunk && event.content) {
            passThrough.write(JSON.stringify({ token: event.content }) + '\n');
          }
        },
        error: (err) => {
          passThrough.write(JSON.stringify({ error: err.message }) + '\n');
          passThrough.end();
        },
        complete: () => passThrough.end(),
      });

      return response.ok({
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: passThrough,
      });
    }
  );
}
