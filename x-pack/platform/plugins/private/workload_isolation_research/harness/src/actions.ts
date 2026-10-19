/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from './driver';
import { API, kbn } from './kibana_client';
import { awaitDrained, awaitTasks } from './await_tasks';

type Action = (
  params: Record<string, unknown>,
  ctx: ActionContext
) => Promise<Record<string, unknown>>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const must = <T>(res: { status: number; body: T }, what: string): T => {
  if (res.status >= 300)
    throw new Error(`${what} failed: ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`);
  return res.body;
};

/** Tier B driver actions (phase `action` names). */
export const ACTIONS: Record<string, Action> = {
  /** No-op treatment (A/A windows). */
  idle: async () => ({ completed_at: Date.now() }),

  /** Seeds Tier B data through the research plugin (server-side, works on QAF without ES creds). */
  seed: async (params, { target, log }) => {
    if (process.env.WIR_ES_URL && process.env.WIR_ES_API_KEY) {
      // Direct seeding (serverless: the image's seed route still sets shard counts, which
      // serverless rejects). Same seed functions as the plugin route.
      const { Client } = await import('@elastic/elasticsearch');
      const { seedFieldCaps, seedAlertingWide } = await import('../../common/seed');
      const es = new Client({
        node: process.env.WIR_ES_URL,
        auth: { apiKey: process.env.WIR_ES_API_KEY },
        requestTimeout: 600000,
      }) as unknown as Parameters<typeof seedFieldCaps>[0];
      const result =
        params.kind === 'field_caps'
          ? await seedFieldCaps(es, {
              indices: Number(params.indices ?? 50),
              fieldsPerIndex: Number(params.fieldsPerIndex ?? 2000),
              conflictRatio: Number(params.conflictRatio ?? 0.2),
              uniqueRatio: Number(params.uniqueRatio ?? 0),
              omitShards: true,
            })
          : await seedAlertingWide(
              es,
              Number(params.rows ?? 1000),
              Number(params.fields ?? 100),
              true
            );
      log(`seed (direct ES) ${JSON.stringify(params)} -> ${JSON.stringify(result)}`);
      return result as Record<string, unknown>;
    }
    const body = must(
      await kbn(target, 'POST', `${API}/tier_b/seed`, params, 30 * 60 * 1000),
      'seed'
    );
    log(`seed ${JSON.stringify(params)} -> ${JSON.stringify(body)}`);
    return body as Record<string, unknown>;
  },

  /** Repeated large field_caps via the data views fetcher, from a route or a TM task. */
  'field-caps': async (params, { target, runId, log }) => {
    const body = must(
      await kbn<Record<string, unknown>>(
        target,
        'POST',
        `${API}/tier_b/field_caps`,
        { repeat: params.repeat, decompose: params.decompose, mode: params.mode, runId },
        30 * 60 * 1000
      ),
      'field-caps'
    );
    log(`field-caps ${JSON.stringify(params)} -> ${JSON.stringify(body).slice(0, 400)}`);
    if (params.mode === 'task') {
      // Phase completion: await the replay task by id (fail on timeout).
      const done = await awaitTasks(
        target,
        [String(body.task_id)],
        Number(params.timeoutS ?? 900) * 1000
      );
      return { ...body, completed_at: done.completedAt, waited_ms: done.waitedMs };
    }
    return body;
  },

  /** Workflow: elasticsearch.search (size N) then data.map over every row (Tier B workflow replay). */
  'workflow-map': async (params, { target, runId, log }) => {
    const size = Number(params.size ?? 10000);
    await kbn(target, 'POST', '/internal/kibana/settings', {
      changes: { 'workflows:ui:enabled': true },
    });
    const fieldLines = Array.from(
      { length: Number(params.fields ?? 10) },
      (_, f) => `        f${f}: "\${{ item._source.attr_${f} }}"`
    ).join('\n');
    const yaml = `version: '1'
name: wir-data-map-${runId.slice(-20)}
enabled: true
triggers:
  - type: manual
steps:
  - name: fetch
    type: elasticsearch.search
    with:
      index: wir-alerting-wide
      size: ${size}
      _source: ['host.name', 'attr_0', 'attr_1', 'attr_2', 'attr_3', 'attr_4', 'attr_5', 'attr_6', 'attr_7', 'attr_8', 'attr_9']
      query:
        match_all: {}
  - name: shape
    type: data.map
    items: "\${{ steps.fetch.output.hits.hits }}"
    with:
      fields:
        id: "\${{ item._id }}"
        host: "\${{ item._source.host.name }}"
${fieldLines}
`;
    const wf = must(
      await kbn<{ id: string }>(target, 'POST', '/api/workflows/workflow', { yaml }),
      'create workflow'
    );
    const t0 = Date.now();
    const run = must(
      await kbn<{ workflowExecutionId?: string; executionId?: string }>(
        target,
        'POST',
        `/api/workflows/workflow/${wf.id}/run`,
        { inputs: {} }
      ),
      'run workflow'
    );
    const execId = run.workflowExecutionId ?? run.executionId;
    let status: Record<string, any> = {};
    const deadline = Date.now() + Number(params.timeoutS ?? 600) * 1000;
    while (execId && Date.now() < deadline) {
      await sleep(1000);
      const r = await kbn<Record<string, any>>(
        target,
        'GET',
        `/api/workflows/executions/${execId}`
      ).catch(() => undefined);
      status = r?.body ?? {};
      if (['completed', 'failed', 'cancelled', 'timed_out'].includes(String(status.status))) break;
    }
    const result = {
      workflow_id: wf.id,
      execution_id: execId,
      status: status.status,
      ms: Date.now() - t0,
      error: status.error,
    };
    log(`workflow-map ${JSON.stringify(params)} -> ${JSON.stringify(result).slice(0, 400)}`);
    await kbn(target, 'DELETE', `/api/workflows/workflow/${wf.id}`).catch(() => undefined);
    if (status.status !== 'completed') {
      throw new Error(`workflow execution ${execId} ended ${status.status ?? 'timeout'}`);
    }
    return result;
  },

  /**
   * Agent Builder converse with a mocked LLM (served by the research plugin): N parallel
   * execute_esql tool calls over wide rows, then a final answer. mode local = HTTP route,
   * task_manager = background execution.
   */
  'agent-builder': async (params, { target, runId, log }) => {
    const calls = Number(params.calls ?? 5);
    const limit = Number(params.limit ?? 1000);
    const hang = params.hangMs ? `-hang${params.hangMs}` : '';
    const secretRes = await kbn<{ secret: string }>(target, 'GET', `${API}/mock_llm/_secret`);
    const mockSecret = must(secretRes, 'mock llm secret').secret;
    const connector = must(
      await kbn<{ id: string }>(target, 'POST', '/api/actions/connector', {
        name: `wir-mock-llm-${runId}`.slice(0, 100),
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `${
            process.env.WIR_KIBANA_SELF_URL ?? target.url
          }${API}/mock_llm/${calls}-${limit}${hang}/chat/completions`,
          defaultModel: 'gpt-4',
          headers: { 'x-elastic-internal-origin': 'kibana' },
        },
        // Mock bearer secret (project-wide, superuser-readable) required by the canned LLM route.
        secrets: { apiKey: mockSecret },
      }),
      'create mock llm connector'
    );
    const results: Array<Record<string, unknown>> = [];
    for (let i = 0; i < Number(params.runs ?? 1); i++) {
      const t0 = Date.now();
      const res = await kbn<Record<string, any>>(
        target,
        'POST',
        '/api/agent_builder/converse',
        {
          input: 'Summarise the research rows.',
          connector_id: connector.id,
          _execution_mode: params.mode ?? 'local',
        },
        15 * 60 * 1000
      ).catch((e) => ({ status: 0, body: { error: String(e) } as Record<string, any> }));
      const steps = res.body?.steps ?? [];
      results.push({
        status: res.status,
        ms: Date.now() - t0,
        steps: steps.length,
        tool_calls: steps.filter((s: Record<string, unknown>) => s.type === 'tool_call').length,
        error: res.status >= 300 ? JSON.stringify(res.body).slice(0, 300) : undefined,
      });
    }
    log(`agent-builder ${JSON.stringify(params)} -> ${JSON.stringify(results)}`);
    await kbn(target, 'DELETE', `/api/actions/connector/${connector.id}`).catch(() => undefined);
    return { results };
  },

  /**
   * ES|QL rule over wide rows (one alert per row) with N mustache-heavy actions per alert.
   * Exercises alerting -> actions renderActionParameterTemplates per alert x action.
   */
  'alerting-esql': async (params, { target, runId, log }) => {
    const actionsPerAlert = Number(params.actionsPerAlert ?? 2);
    const rows = Number(params.rows ?? 1000);
    const connector = must(
      await kbn<{ id: string }>(target, 'POST', '/api/actions/connector', {
        name: `wir-index-${runId}`.slice(0, 100),
        connector_type_id: '.index',
        config: { index: 'wir-alert-actions', refresh: false },
      }),
      'create connector'
    );
    const template = {
      run_id: runId,
      rule: '{{rule.name}}',
      alert: '{{alert.id}}',
      message: '{{context.message}}',
      hits: '{{context.hits}}',
      context: '{{context}}',
    };
    const rule = must(
      await kbn<{ id: string }>(target, 'POST', '/api/alerting/rule', {
        name: `wir-esql-wide-${runId}`.slice(0, 200),
        consumer: 'stackAlerts',
        rule_type_id: '.es-query',
        schedule: { interval: '1h' },
        enabled: true,
        params: {
          searchType: 'esqlQuery',
          esqlQuery: { esql: `FROM wir-alerting-wide | LIMIT ${rows}` },
          timeField: '@timestamp',
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          groupBy: 'row',
          sourceFields: [],
        },
        actions: Array.from({ length: actionsPerAlert }, () => ({
          id: connector.id,
          group: 'query matched',
          params: { documents: [template] },
          frequency: { summary: false, notify_when: 'onActiveAlert', throttle: null },
        })),
      }),
      'create rule'
    );
    log(
      `alerting-esql rule=${rule.id} connector=${connector.id} rows=${rows} actionsPerAlert=${actionsPerAlert}`
    );
    const deadline = Date.now() + Number(params.timeoutS ?? 600) * 1000;
    let status: Record<string, any> = {};
    while (Date.now() < deadline) {
      await sleep(2000);
      const r = await kbn<Record<string, any>>(
        target,
        'GET',
        `/api/alerting/rule/${rule.id}`
      ).catch(() => undefined);
      status = r?.body ?? {};
      if (
        status.last_run?.outcome ||
        status.execution_status?.status === 'active' ||
        status.execution_status?.status === 'error'
      )
        break;
    }
    log(
      `alerting-esql status=${JSON.stringify({ es: status.execution_status, lr: status.last_run })}`
    );
    if (!status.last_run?.outcome && !status.execution_status) {
      throw new Error(`alerting rule ${rule.id} did not execute within ${params.timeoutS ?? 600}s`);
    }
    // Phase completion: wait until the enqueued action tasks drained (fail on timeout).
    const drained = await awaitDrained(
      target,
      ['actions:.index'],
      Number(params.drainTimeoutS ?? 900) * 1000
    );
    log(`alerting-esql actions drained after ${drained.waitedMs} ms`);
    await kbn(target, 'POST', `/api/alerting/rule/${rule.id}/_disable`).catch(() => undefined);
    await kbn(target, 'DELETE', `/api/alerting/rule/${rule.id}`).catch(() => undefined);
    // Connector intentionally kept: queued action tasks still reference it (deleting it early
    // fails them with "Saved object not found").
    return {
      rule_id: rule.id,
      execution_status: status.execution_status,
      last_run: status.last_run,
      completed_at: drained.completedAt,
      drain_ms: drained.waitedMs,
    };
  },
};
