/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

/** Minimal shape of an ES `_search` response we consume. */
interface EsSearchResponse {
  hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
}

/**
 * Thin client for reading incident metadata DIRECTLY from the INCIDENT cluster's
 * Elasticsearch (`rootly_incidents` / `pagerduty_incidents`), via Kibana's Console
 * proxy — no Agent Builder involved. Step 1 used to converse with an LLM agent to
 * gather these facts; every field it returned is a raw document field, so we read
 * them deterministically instead (the same reason `date` was already read via
 * ES|QL and used to override the LLM).
 *
 * Auth is a Kibana API key sent as `Authorization: ApiKey <key>`. Because it only
 * calls the Console proxy + reads documents, the key needs Elasticsearch `read` on
 * those indices plus Console access — NOT the `agentBuilder` / connector-execute
 * privileges the old converse path required.
 */
export class IncidentMetadataClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly log: ToolingLog;
  private readonly signal?: AbortSignal;

  constructor({
    kibanaUrl,
    apiKey,
    log,
    signal,
  }: {
    kibanaUrl: string;
    apiKey: string;
    log: ToolingLog;
    signal?: AbortSignal;
  }) {
    // Trim a trailing slash so URL joining stays predictable.
    this.baseUrl = kibanaUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.log = log;
    this.signal = signal;
  }

  /**
   * Runs an Elasticsearch `_search` against `index` through Kibana's Console proxy
   * (authenticated with the key's own ES privileges) and returns the matching
   * documents' `_source`. Reading full `_source` — rather than an ES|QL `KEEP` of
   * guessed columns — keeps this tolerant of the exact `rootly_incidents` /
   * `pagerduty_incidents` mapping (dotted vs nested keys, array-of-object fields).
   * `ignore_unavailable=true` lets a comma-list target a not-yet-created staging
   * index without failing.
   */
  async search(
    index: string,
    body: Record<string, unknown>
  ): Promise<Array<Record<string, unknown>>> {
    const path = `${index}/_search?ignore_unavailable=true`;
    const url = `${this.baseUrl}/api/console/proxy?path=${encodeURIComponent(path)}&method=POST`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: this.signal,
    } as RequestInit);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `_search on "${index}" failed (${response.status}) at ${url}: ${text || '<no body>'}`
      );
    }

    const json = (await response.json()) as EsSearchResponse;
    const hits = json.hits?.hits ?? [];
    this.log.debug(`_search on "${index}" returned ${hits.length} hit(s).`);
    return hits.map((hit) => hit._source ?? {});
  }
}
