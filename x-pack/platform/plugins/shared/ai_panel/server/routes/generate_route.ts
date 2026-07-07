/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import {
  AI_PANEL_CSP_META,
  AI_PANEL_MAX_PROMPT_LENGTH,
  AI_PANEL_MAX_ESQL_QUERY_LENGTH,
} from '../../common/constants';
import { runEsqlQuery, sanitizeCellValue } from '../utils/esql_query';
import type { EsqlColumn } from '../utils/esql_query';

const SOCKET_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_HTML_BYTES = 500_000;

type ColorMode = 'LIGHT' | 'DARK';

function colorSection(colorMode: ColorMode): string {
  const theme = colorMode === 'DARK' ? euiDarkVars : euiLightVars;
  const accents = `${theme.euiColorPrimary} (blue), ${theme.euiColorAccentSecondary} (teal), ${theme.euiColorAccent} (pink), ${theme.euiColorWarning} (yellow)`;

  if (colorMode === 'DARK') {
    return `VISUAL DESIGN — DARK MODE (apply these colors exactly, do not substitute):
- IMPORTANT: body background MUST be ${theme.euiColorEmptyShade}. Text color: ${theme.euiColorTextParagraph}.
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: ${theme.euiColorTextParagraph}; background: ${theme.euiColorEmptyShade}; }
- Card/surface backgrounds: ${theme.euiColorLightestShade}. Borders: ${theme.euiColorBorderBasePlain}.
- Accent colors: ${accents}.
- Clean, modern design. Comfortable padding. No harsh borders.`;
  }
  return `VISUAL DESIGN — LIGHT MODE (apply these colors exactly, do not substitute):
- IMPORTANT: body background MUST be transparent — do NOT set background on <html> or <body>. Text color: ${theme.euiColorTextParagraph}.
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: ${theme.euiColorTextParagraph}; }
- Accent colors: ${accents}.
- Card/surface backgrounds: ${theme.euiColorEmptyShade}. Borders: ${theme.euiColorBorderBasePlain}.
- Clean, modern design. Comfortable padding. No harsh borders.`;
}

function buildSystemPromptStatic(colorMode: ColorMode): string {
  return `You are a data visualization assistant embedded in a Kibana dashboard panel.

Your job is to generate a single self-contained HTML document that presents the user's data or answers their prompt in the most appropriate visual form.

OUTPUT RULES — follow these exactly:
- Output ONLY valid HTML. No markdown fences, no explanation, no commentary before or after.
- The HTML must be fully self-contained: all CSS inline in <style> tags.
- CRITICAL: Do NOT include ANY <script> tags or JavaScript whatsoever. No inline scripts, no external scripts, no event handlers. Pure HTML + CSS only.
- Do NOT use <a> anchor tags or href attributes of any kind.
- Do NOT load any external resources. No CDN scripts, no Google Fonts, no images from URLs.
- For charts and diagrams, use pure CSS (bar charts with div widths, progress bars, etc.) or inline SVG.

${colorSection(colorMode)}

CONTENT RULES:
- Pick the visualization type that best fits the data and the prompt. Do NOT default to charts when a table, list, KPI card, or status board is more appropriate.
- Fill the full panel width. Height should fit the content naturally.
- Do not add a title — the dashboard panel has its own title.
- For bar charts: use a div with a colored background and width set to the percentage value inline style.
- For status indicators: use colored badges/pills with CSS background-color.`;
}

function buildSystemPromptTemplate(colorMode: ColorMode): string {
  return `You are a data visualization assistant embedded in a Kibana dashboard panel.

Generate a reusable HTML template using Liquid template syntax. The template is filled with real ES|QL query results at render time — do NOT embed literal data values.

DATA MODEL available in the template:
- rows: array of row objects. Access a column with its EXACT name (as given in the schema below) using bracket notation: row["exact column name"].
  Each column access resolves to an object: .value is the raw cell value, .pct is that column's value as a percentage (0–100) of its max across all rows (numeric columns only).
- max: object of column max values, also keyed by exact column name. e.g. max["total_revenue"]

LIQUID SYNTAX:
- Loop rows:     {% for row in rows %}...{% endfor %}
- Empty state:   {% if rows.size == 0 %}...{% endif %}
- Conditionals:  {% if row["revenue"].value >= 10000 %}...{% elsif row["revenue"].value >= 5000 %}...{% else %}...{% endif %}
- Output value:  {{ row["column name"].value }}
- Bar width:     <div style="width: {{ row["column name"].pct }}%; ..."></div>
- Filters:       {{ row["column name"].value | round: 2 }}

OUTPUT RULES:
- Output ONLY the HTML template. No markdown fences, no explanation.
- All CSS inline in <style> tags.
- CRITICAL: No <script> tags or JavaScript. No <a> anchor tags or href attributes. Pure HTML + CSS only.
- No external resources (no CDN, no Google Fonts, no image URLs).
- For charts use pure CSS or inline SVG.

${colorSection(colorMode)}

CONTENT RULES:
- Pick the best visualization for the schema and prompt. Full panel width; height fits content naturally. No title.
- Status board example:
  {% for row in rows %}
  <div class="card {% if row["revenue"].value >= 10000 %}card-green{% elsif row["revenue"].value >= 5000 %}card-yellow{% else %}card-red{% endif %}">
    <span>{{ row["category"].value }}</span><span>{{ row["revenue"].value }}</span>
  </div>
  {% endfor %}`;
}

function formatSampleTable(columns: EsqlColumn[], rows: unknown[][]): string {
  const header = columns.map((c) => sanitizeCellValue(c.name)).join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const dataRows = rows
    .slice(0, 3)
    .map((row) => row.map(sanitizeCellValue).join(' | '))
    .join('\n');
  return `${header}\n${separator}\n${dataRows}`;
}

interface StartDeps {
  inference: InferenceServerStart;
}

export function registerGenerateRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices'],
  logger: Logger
) {
  router.post(
    {
      path: '/internal/ai_panel/generate',
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: SOCKET_TIMEOUT_MS },
      },
      validate: {
        body: schema.object({
          prompt: schema.string({ minLength: 1, maxLength: AI_PANEL_MAX_PROMPT_LENGTH }),
          esqlQuery: schema.maybe(schema.string({ maxLength: AI_PANEL_MAX_ESQL_QUERY_LENGTH })),
          timeRange: schema.maybe(schema.object({ from: schema.string(), to: schema.string() })),
          colorMode: schema.oneOf([schema.literal('LIGHT'), schema.literal('DARK')], {
            defaultValue: 'LIGHT',
          }),
        }),
      },
    },
    async (context, request, response) => {
      const [, { inference }] = await getStartServices();
      const { prompt, esqlQuery, timeRange, colorMode } = request.body;
      const core = await context.core;

      const connector = await inference.getDefaultConnector(request).catch(() => undefined);
      if (!connector) {
        return response.badRequest({
          body: i18n.translate('xpack.aiPanel.generateRoute.noConnectorError', {
            defaultMessage: 'No inference connector configured',
          }),
        });
      }
      const { connectorId } = connector;

      const passThrough = new PassThrough();
      const abortController = new AbortController();
      const abortSub = request.events.aborted$.subscribe(() => abortController.abort());

      let userMessage: string;
      let systemPrompt: string;

      if (esqlQuery) {
        systemPrompt = buildSystemPromptTemplate(colorMode);

        let columns: EsqlColumn[] = [];
        let sampleRows: unknown[][] = [];
        try {
          const result = await runEsqlQuery(
            core.elasticsearch.client.asCurrentUser,
            esqlQuery,
            timeRange
          );
          columns = result.columns;
          sampleRows = result.rows;
        } catch {
          /* non-fatal — generate template from prompt + partial schema */
        }

        if (columns.length > 0) {
          // Not sanitizeCellValue'd — must match the real key used in fillTemplate exactly.
          const schemaLines = columns.map((c) => `  - ${c.name} (${c.type})`).join('\n');
          const sampleSection =
            sampleRows.length > 0
              ? `\n\nSample rows:\n${formatSampleTable(columns, sampleRows)}`
              : '\n\nNote: no rows available for the current time range.';
          userMessage = `${prompt}\n\nData schema:\n${schemaLines}${sampleSection}\n\nGenerate an HTML template that accesses each column via bracket notation using its exact name, e.g. row["${columns[0].name}"].value.`;
        } else {
          userMessage = `${prompt}\n\nNote: schema unavailable. Generate a suitable template based on the prompt.`;
        }
      } else {
        systemPrompt = buildSystemPromptStatic(colorMode);
        userMessage = prompt;
      }

      // For static panels, prepend CSP as the first token so the iframe gets it immediately.
      // Template panels skip this — CSP is injected client-side after placeholder fill.
      if (!esqlQuery) {
        passThrough.write(JSON.stringify({ token: AI_PANEL_CSP_META }) + '\n');
      }

      const client = inference.getClient({ request });
      const events$ = client.chatComplete({
        connectorId,
        system: systemPrompt,
        messages: [{ role: MessageRole.User, content: userMessage }],
        stream: true,
        abortSignal: abortController.signal,
      });

      let accHtmlBytes = 0;
      let sizeLimitExceeded = false;
      events$.subscribe({
        next: (event) => {
          if (sizeLimitExceeded) return;
          if (event.type === ChatCompletionEventType.ChatCompletionChunk && event.content) {
            accHtmlBytes += Buffer.byteLength(event.content, 'utf8');
            if (accHtmlBytes > MAX_HTML_BYTES) {
              sizeLimitExceeded = true;
              abortController.abort();
              abortSub.unsubscribe();
              if (!passThrough.writableEnded) {
                passThrough.write(
                  JSON.stringify({
                    error: i18n.translate('xpack.aiPanel.generateRoute.sizeLimitError', {
                      defaultMessage: 'Generated content exceeded size limit',
                    }),
                  }) + '\n'
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
          abortSub.unsubscribe();
          logger.error(`AI panel generation failed: ${err.message}`);
          if (!passThrough.writableEnded) {
            passThrough.write(
              JSON.stringify({
                error: i18n.translate('xpack.aiPanel.generateRoute.generationFailedError', {
                  defaultMessage: 'AI panel generation failed',
                }),
              }) + '\n'
            );
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
