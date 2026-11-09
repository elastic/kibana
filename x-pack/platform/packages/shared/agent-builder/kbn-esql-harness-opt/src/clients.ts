/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client as EsClient } from '@elastic/elasticsearch';

export interface HarnessTarget {
  kibanaUrl: string;
  esUrl: string;
  username: string;
  password: string;
}

const firstNonEmpty = (...values: Array<string | undefined>): string =>
  values.find((value) => typeof value === 'string' && value.length > 0) ?? '';

export const resolveTarget = (overrides: Partial<HarnessTarget> = {}): HarnessTarget => ({
  kibanaUrl: firstNonEmpty(overrides.kibanaUrl, process.env.KIBANA_URL, 'http://localhost:5601'),
  esUrl: firstNonEmpty(overrides.esUrl, process.env.ES_URL, 'http://localhost:9200'),
  username: firstNonEmpty(overrides.username, process.env.ES_USERNAME, 'elastic'),
  password: firstNonEmpty(overrides.password, process.env.ES_PASSWORD, 'changeme'),
});

export const createEsClient = (target: HarnessTarget): EsClient =>
  new EsClient({
    node: target.esUrl,
    auth: { username: target.username, password: target.password },
    requestTimeout: 120_000,
  });

export interface ToolRunResult {
  esql?: string;
  rawResults: unknown[];
  errors: unknown[];
  latencyMs: number;
  httpError?: string;
}

interface ToolResultEntry {
  type?: string;
  data?: { esql?: string };
}

/**
 * Run `platform.core.generate_esql` through the public tool-execute API.
 *
 * Going through HTTP rather than the Playwright eval runner keeps a round cheap to repeat: the
 * loop can swap harness configs and re-run a split without restarting Kibana or Scout.
 */
export const executeGenerateEsql = async ({
  target,
  question,
  index,
  connectorId,
  timeoutMs = 300_000,
}: {
  target: HarnessTarget;
  question: string;
  index?: string;
  connectorId?: string;
  timeoutMs?: number;
}): Promise<ToolRunResult> => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${target.kibanaUrl}/api/agent_builder/tools/_execute`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'harness-opt',
        authorization: `Basic ${Buffer.from(`${target.username}:${target.password}`).toString(
          'base64'
        )}`,
      },
      body: JSON.stringify({
        tool_id: 'platform.core.generate_esql',
        tool_params: { query: question, ...(index ? { index } : {}) },
        ...(connectorId ? { connector_id: connectorId } : {}),
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        rawResults: [],
        errors: [],
        latencyMs,
        httpError: `${response.status} ${await response.text()}`.slice(0, 2000),
      };
    }

    const body = (await response.json()) as { results?: ToolResultEntry[]; errors?: unknown[] };
    const results = body.results ?? [];
    const esql = results
      .filter((entry) => entry.type === 'query')
      .map((entry) => entry.data?.esql)
      .find(Boolean);

    return { esql, rawResults: results, errors: body.errors ?? [], latencyMs };
  } catch (e) {
    return {
      rawResults: [],
      errors: [],
      latencyMs: Date.now() - startedAt,
      httpError: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
};
