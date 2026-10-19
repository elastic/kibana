/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from './driver';
import { API, kbn } from './kibana_client';

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
  /** Seeds Tier B data through the research plugin (server-side, works on QAF without ES creds). */
  seed: async (params, { target, log }) => {
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
    if (params.mode === 'task') await sleep(Number(params.waitS ?? 30) * 1000);
    return body;
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
    // Let the enqueued action tasks drain before the phase tail.
    await sleep(Number(params.drainS ?? 30) * 1000);
    await kbn(target, 'POST', `/api/alerting/rule/${rule.id}/_disable`).catch(() => undefined);
    await kbn(target, 'DELETE', `/api/alerting/rule/${rule.id}`).catch(() => undefined);
    await kbn(target, 'DELETE', `/api/actions/connector/${connector.id}`).catch(() => undefined);
    return {
      rule_id: rule.id,
      execution_status: status.execution_status,
      last_run: status.last_run,
    };
  },
};
