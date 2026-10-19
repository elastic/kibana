/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

/*
 * RESEARCH ONLY: OpenAI-compatible mock LLM served by Kibana itself, so the Agent Builder
 * replay works identically locally and on QAF (no laptop-side proxy reachable from the
 * cloud). Mirrors the createLlmProxy scenarios used by Agent Builder Scout tests:
 * title generation -> N parallel tool calls -> final answer. Stateless, canned output.
 *
 * Unauthenticated by necessity (the .gen-ai connector sends `Authorization: Bearer <apiKey>`,
 * which Kibana cannot authenticate). No side effects; returns canned completions only.
 */

interface ChatMessage {
  role: string;
  content?: unknown;
}

const chunk = (delta: Record<string, unknown>, finish: string | null = null) =>
  `data: ${JSON.stringify({
    id: randomUUID(),
    object: 'chat.completion.chunk',
    created: 0,
    model: 'gpt-4',
    choices: [{ delta, index: 0, finish_reason: finish }],
  })}\n\n`;

const sse = (delta: Record<string, unknown>) =>
  chunk(delta) + chunk({}, 'stop') + 'data: [DONE]\n\n';

const completion = (message: Record<string, unknown>) => ({
  id: randomUUID(),
  created: Date.now(),
  model: 'gpt-4o',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: { refusal: null, role: 'assistant', ...message },
      logprobs: null,
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
});

export const registerMockLlmRoute = (router: IRouter, apiBase: string): void => {
  router.post(
    {
      path: `${apiBase}/mock_llm/{scenario}/chat/completions`,
      security: {
        authz: { enabled: false, reason: 'RESEARCH ONLY canned mock LLM; no side effects' },
        authc: {
          enabled: false,
          reason: 'RESEARCH ONLY: .gen-ai connector sends a Bearer key Kibana cannot authenticate',
        },
      },
      options: { access: 'internal', xsrfRequired: false },
      validate: {
        params: schema.object({ scenario: schema.string({ maxLength: 256 }) }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (_ctx, req, res) => {
      const body = req.body as {
        messages?: ChatMessage[];
        tools?: Array<{ function?: { name?: string } }>;
        stream?: boolean;
      };
      // scenario: "<parallelToolCalls>-<esqlLimit>[-hang<ms>]"
      const [callsRaw, limitRaw, hangRaw] = req.params.scenario.split('-');
      const calls = Math.max(1, Math.min(20, Number(callsRaw) || 3));
      const limit = Math.max(1, Math.min(10000, Number(limitRaw) || 1000));
      const hangMs = hangRaw?.startsWith('hang') ? Number(hangRaw.slice(4)) : 0;
      const messages = body.messages ?? [];
      const system = String(messages.find((m) => m.role === 'system')?.content ?? '');
      const last = messages[messages.length - 1];
      let delta: Record<string, unknown>;
      if (system.includes('title-generation')) {
        delta = { role: 'assistant', content: 'Workload isolation research' };
      } else if (last?.role === 'tool' || !body.tools?.length) {
        if (hangMs > 0) await new Promise((r) => setTimeout(r, hangMs));
        delta = { role: 'assistant', content: 'Research replay complete.' };
      } else {
        const names = body.tools.map((t) => t.function?.name ?? '');
        const esqlTool =
          names.find((n) => n.includes('execute_esql')) ??
          names.find((n) => n.includes('search')) ??
          names[0];
        delta = {
          role: 'assistant',
          content: '',
          tool_calls: Array.from({ length: calls }, (_, i) => ({
            index: i,
            id: `call_${randomUUID().slice(0, 8)}`,
            type: 'function',
            function: {
              name: esqlTool,
              arguments: JSON.stringify({ query: `FROM wir-alerting-wide | LIMIT ${limit}` }),
            },
          })),
        };
      }
      if (body.stream) {
        return res.ok({
          body: sse(delta),
          headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
        });
      }
      return res.ok({
        body: completion({ content: delta.content ?? '', tool_calls: delta.tool_calls }),
      });
    }
  );
};
