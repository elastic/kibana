/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { WorkloadIsolationResearchConfig } from '../config';

/*
 * RESEARCH ONLY: OpenAI-compatible mock LLM served by Kibana itself, so the Agent Builder
 * replay works identically locally and on QAF (no laptop-side proxy reachable from the
 * cloud). Mirrors the createLlmProxy scenarios used by Agent Builder Scout tests:
 * title generation -> N parallel tool calls -> final answer. Stateless, canned output.
 *
 * Kibana auth is disabled for this route (the .gen-ai connector sends `Authorization: Bearer
 * <apiKey>`, which Kibana cannot authenticate). Instead it requires a dedicated mock bearer
 * secret (generated once per project, stored in a hidden index, readable only by superusers via
 * GET mock_llm/_secret and configured as the connector's apiKey). Body size, hang duration and
 * concurrency are bounded; the route is gated by `mockLlm.enabled`. It does do bounded
 * synchronous work on the main thread: byte scans over a body of at most `maxBodyBytes`.
 */

const SECRET_INDEX = '.kibana-research-config';
const SECRET_ID = 'mock_llm_secret';

let cachedSecret: { value: Buffer; at: number } | undefined;

const readSecret = async (es: ElasticsearchClient): Promise<string | undefined> => {
  const doc = await es
    .get<{ secret: string }>({ index: SECRET_INDEX, id: SECRET_ID })
    .catch(() => undefined);
  return doc?._source?.secret;
};

const getOrCreateSecret = async (es: ElasticsearchClient): Promise<string> => {
  const existing = await readSecret(es);
  if (existing) return existing;
  const secret = randomBytes(24).toString('hex');
  await es
    .index({
      index: SECRET_INDEX,
      id: SECRET_ID,
      op_type: 'create',
      document: { secret },
      refresh: 'wait_for',
    })
    .catch(() => undefined);
  return (await readSecret(es)) ?? secret;
};

const secretMatches = async (es: ElasticsearchClient, header: string | undefined) => {
  if (!header?.startsWith('Bearer ')) return false;
  if (!cachedSecret || Date.now() - cachedSecret.at > 30000) {
    const s = await readSecret(es);
    if (!s) return false;
    cachedSecret = { value: Buffer.from(s), at: Date.now() };
  }
  const given = Buffer.from(header.slice('Bearer '.length));
  return given.length === cachedSecret.value.length && timingSafeEqual(given, cachedSecret.value);
};

let inFlight = 0;

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

export const registerMockLlmRoute = (
  router: IRouter,
  apiBase: string,
  config: WorkloadIsolationResearchConfig['mockLlm'],
  getEs: () => Promise<ElasticsearchClient>
): void => {
  if (!config.enabled) return;

  router.get(
    {
      path: `${apiBase}/mock_llm/_secret`,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: { access: 'internal' },
      validate: false,
    },
    async (_ctx, _req, res) => res.ok({ body: { secret: await getOrCreateSecret(await getEs()) } })
  );

  router.post(
    {
      path: `${apiBase}/mock_llm/{scenario}/chat/completions`,
      security: {
        authz: {
          enabled: false,
          reason: 'RESEARCH ONLY canned mock LLM; checks a mock bearer secret',
        },
        authc: {
          enabled: false,
          reason: 'RESEARCH ONLY: .gen-ai connector sends a Bearer key Kibana cannot authenticate',
        },
      },
      // Raw, size-bounded body: never JSON.parse the conversation; only bounded byte scans.
      options: {
        access: 'internal',
        xsrfRequired: false,
        body: { parse: false, output: 'data', maxBytes: config.maxBodyBytes },
      },
      validate: {
        params: schema.object({ scenario: schema.string({ maxLength: 256 }) }),
        body: schema.buffer(),
      },
    },
    async (_ctx, req, res) => {
      const auth = req.headers.authorization;
      if (!(await secretMatches(await getEs(), typeof auth === 'string' ? auth : undefined))) {
        return res.unauthorized({ body: { message: 'mock LLM secret required' } });
      }
      if (inFlight >= config.maxConcurrent) {
        return res.customError({
          statusCode: 429,
          body: { message: 'mock LLM concurrency limit' },
        });
      }
      inFlight++;
      try {
        const out = await handle(req.params.scenario, req.body as Buffer);
        return out.stream
          ? res.ok({
              body: out.body,
              headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
            })
          : res.ok({ body: out.body });
      } finally {
        inFlight--;
      }
    }
  );

  const handle = async (scenario: string, buf: Buffer) => {
    const isStream = buf.includes('"stream":true');
    const isTitle = buf.includes('title-generation');
    const hasToolResult = buf.includes('"role":"tool"');
    const toolsAt = buf.indexOf('"tools"');
    const toolsSlice = toolsAt >= 0 ? buf.subarray(toolsAt, toolsAt + 200000).toString('utf8') : '';
    const names = [...toolsSlice.matchAll(/"name":"([^"]+)"/g)].map((m) => m[1]);
    // scenario: "<parallelToolCalls>-<esqlLimit>[-hang<ms>]"
    const [callsRaw, limitRaw, hangRaw] = scenario.split('-');
    const calls = Math.max(1, Math.min(20, Number(callsRaw) || 3));
    const limit = Math.max(1, Math.min(10000, Number(limitRaw) || 1000));
    const hangMs = Math.min(
      config.maxHangMs,
      Math.max(0, hangRaw?.startsWith('hang') ? Number(hangRaw.slice(4)) || 0 : 0)
    );
    let delta: Record<string, unknown>;
    if (isTitle) {
      delta = { role: 'assistant', content: 'Workload isolation research' };
    } else if (hasToolResult || !names.length) {
      if (hangMs > 0) await new Promise((r) => setTimeout(r, hangMs));
      delta = { role: 'assistant', content: 'Research replay complete.' };
    } else {
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
    return isStream
      ? { stream: true as const, body: sse(delta) }
      : {
          stream: false as const,
          body: completion({ content: delta.content ?? '', tool_calls: delta.tool_calls }),
        };
  };
};
