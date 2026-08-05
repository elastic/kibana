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
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_ENABLED_FLAG_KEY,
} from '../../common/constants';

const SOCKET_TIMEOUT_MS = 5 * 60 * 1000;

type ColorMode = 'LIGHT' | 'DARK';

function colorSection(colorMode: ColorMode): string {
  const theme = colorMode === 'DARK' ? euiDarkVars : euiLightVars;
  const accents = `${theme.euiColorPrimary} (blue), ${theme.euiColorAccentSecondary} (teal), ${theme.euiColorAccent} (pink), ${theme.euiColorWarning} (yellow)`;

  if (colorMode === 'DARK') {
    return `VISUAL DESIGN — DARK MODE (apply these colors exactly, do not substitute):
- IMPORTANT: body background MUST be ${theme.euiColorEmptyShade}. Text color: ${theme.euiColorTextParagraph}.
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: ${theme.euiColorTextParagraph}; background: ${theme.euiColorEmptyShade}; }
- Card/surface backgrounds: ${theme.euiColorLightestShade}.
- Accent colors: ${accents}.
- Clean, modern design. Comfortable padding. Do NOT add a border around cards, containers, or the panel by default — separate elements using background-color contrast and spacing only. Only add a border (e.g. ${theme.euiColorBorderBasePlain}) if the user explicitly asks for one.`;
  }
  return `VISUAL DESIGN — LIGHT MODE (apply these colors exactly, do not substitute):
- IMPORTANT: body background MUST be transparent — do NOT set background on <html> or <body>. Text color: ${theme.euiColorTextParagraph}.
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: ${theme.euiColorTextParagraph}; }
- Accent colors: ${accents}.
- Card/surface backgrounds: ${theme.euiColorEmptyShade}.
- Clean, modern design. Comfortable padding. Do NOT add a border around cards, containers, or the panel by default — separate elements using background-color contrast and spacing only. Only add a border (e.g. ${theme.euiColorBorderBasePlain}) if the user explicitly asks for one.`;
}

function buildSystemPromptStatic(colorMode: ColorMode): string {
  return `You are a custom content assistant embedded in a Kibana dashboard panel.

Your job is to generate a single self-contained HTML document that presents the user's data or answers their prompt in the most appropriate form.

OUTPUT RULES — follow these exactly:
- Output ONLY valid HTML. No markdown fences, no explanation, no commentary before or after.
- The HTML must be fully self-contained: all CSS inline in <style> tags.
- ABSOLUTE, NON-NEGOTIABLE RULE: this HTML renders inside a sandboxed iframe with scripting disabled. ANY JavaScript you write — a <script> tag, an inline event handler (onclick, onmouseover, ...), or building any part of the chart's markup at runtime via document.getElementById/innerHTML/addEventListener/JSON.parse/fetch — will NEVER RUN. It is not slower, not degraded, not partially working: it is completely dead code, and everything that depends on it (including the chart itself, if you generate its SVG/HTML from inside a <script>) will render as a BLANK PANEL. Write every element you want visible directly as static HTML/SVG in the body — never assemble markup as a string in JavaScript and inject it via innerHTML.
- If the prompt asks for hover interactivity (e.g. "show a tooltip with the value on hover"), this IS possible with CSS alone — do NOT skip it and do NOT reach for JavaScript. Give the element a nested tooltip element that is invisible by default (\`opacity: 0\`) and reveal it with a \`:hover\` rule, e.g. \`.item:hover .tooltip { opacity: 1; }\`.
- Do NOT use <a> anchor tags or href attributes of any kind.
- Do NOT load any external resources. No CDN scripts, no Google Fonts, no images from URLs.
- Do NOT use <img> tags with an external \`src\` (e.g. a photo URL) — the panel's Content-Security-Policy blocks all outbound network requests, so it will silently fail to render. If the prompt asks for an image, icon, or illustration (a dog, a rocket, a flag, etc.), draw it with inline SVG (<svg><path>/<circle>/<rect>...), pure CSS shapes, or a Unicode emoji/symbol character instead.
- For diagrams and progress indicators, use pure CSS or inline SVG.

${colorSection(colorMode)}

CONTENT RULES:
- Pick the presentation format that best fits the data and the prompt. Prefer tables, lists, KPI cards, and status boards over charts.
- Fill the full panel width. Height should fit the content naturally.
- Do not add a title — the dashboard panel has its own title.
- For status indicators: use colored badges/pills with CSS background-color.`;
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
      path: '/internal/custom_content/generate',
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: SOCKET_TIMEOUT_MS },
      },
      validate: {
        body: schema.object({
          prompt: schema.string({ minLength: 1, maxLength: CUSTOM_CONTENT_MAX_PROMPT_LENGTH }),
          colorMode: schema.oneOf([schema.literal('LIGHT'), schema.literal('DARK')], {
            defaultValue: 'LIGHT',
          }),
        }),
      },
    },
    async (context, request, response) => {
      const [coreStart, { inference }] = await getStartServices();
      // Temporary kill-switch — remove once the feature is approved to ship.
      if (!coreStart.featureFlags.getBooleanValue(CUSTOM_CONTENT_ENABLED_FLAG_KEY, false)) {
        return response.notFound();
      }

      const { prompt, colorMode } = request.body;

      const defaultConnector = await inference.getDefaultConnector(request).catch(() => null);
      const connector =
        defaultConnector ?? (await inference.getConnectorList(request).catch(() => []))[0] ?? null;

      const passThrough = new PassThrough();
      const abortController = new AbortController();
      const abortSub = request.events.aborted$.subscribe(() => abortController.abort());

      if (!connector) {
        passThrough.write(
          JSON.stringify({
            error: i18n.translate('xpack.customContent.generateRoute.noConnectorError', {
              defaultMessage: 'No inference connector configured',
            }),
            code: 'no_connector',
          }) + '\n'
        );
        passThrough.end();
        return response.ok({
          headers: { 'Content-Type': 'application/x-ndjson' },
          body: passThrough,
        });
      }
      const { connectorId } = connector;

      const systemPrompt = buildSystemPromptStatic(colorMode);

      const client = inference.getClient({ request });
      const events$ = client.chatComplete({
        connectorId,
        system: systemPrompt,
        messages: [{ role: MessageRole.User, content: prompt }],
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
            if (accHtmlBytes > CUSTOM_CONTENT_MAX_TEMPLATE_BYTES) {
              sizeLimitExceeded = true;
              abortController.abort();
              abortSub.unsubscribe();
              if (!passThrough.writableEnded) {
                passThrough.write(
                  JSON.stringify({
                    error: i18n.translate('xpack.customContent.generateRoute.sizeLimitError', {
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
          logger.error(`Custom content generation failed: ${err.message}`);
          if (!passThrough.writableEnded) {
            passThrough.write(
              JSON.stringify({
                error: i18n.translate('xpack.customContent.generateRoute.generationFailedError', {
                  defaultMessage: 'Custom content generation failed',
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
