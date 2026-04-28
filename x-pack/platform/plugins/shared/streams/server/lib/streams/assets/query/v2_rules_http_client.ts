/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import https from 'https';
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { stripMetadata } from '@kbn/streams-schema';
import {
  STREAMS_RULE_CONSUMER,
  STREAMS_ESQL_RULE_TYPE_ID,
  type CreateRuleBody,
  type IRulesManagementClient,
  type UpdateRuleBody,
} from './rules_management_client';

const V2_RULES_BASE_PATH = '/api/alerting/v2/rules';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Implements IRulesManagementClient via HTTP loopback to the Alerting v2 REST API.
 *
 * Forwards `authorization` and `cookie` headers from the originating KibanaRequest so that
 * the v2 route runs under the same identity as the caller.
 *
 * create/update handle their own 409/404 fallbacks internally so QueryClient does not
 * need to know which framework is in use.
 *
 * Space context: SigEvents rules always operate in the default space. The URL is built from
 * `serverBasePath` (no `/s/{space}` segment), matching the v1 path which uses
 * `getRulesClientWithRequestInSpace(request, DEFAULT_SPACE_ID)`.
 */
export class V2RulesHttpClient implements IRulesManagementClient {
  private readonly baseUrl: string;
  private readonly authHeaders: Record<string, string>;
  private readonly agent: https.Agent | undefined;

  constructor(
    request: KibanaRequest,
    serverInfo: { protocol: string; hostname: string; port: number },
    basePath: string,
    private readonly logger: Logger
  ) {
    const { protocol, hostname, port } = serverInfo;
    this.baseUrl = `${protocol}://${hostname}:${port}${basePath}`;

    if (protocol === 'https') {
      // Loopback calls to the same Kibana process — dev/test environments commonly
      // use self-signed certs that would fail verification. This is safe because the
      // connection never leaves the host (localhost loopback to serverInfo).
      this.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const headers: Record<string, string> = {
      'kbn-xsrf': 'true',
      'content-type': 'application/json',
    };

    const authHeader = request.headers.authorization;
    if (authHeader) {
      headers.authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    }

    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      headers.cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    }

    this.authHeaders = headers;
  }

  async createRule(id: string, body: CreateRuleBody): Promise<void> {
    const url = `${this.baseUrl}${V2_RULES_BASE_PATH}/${encodeURIComponent(id)}`;
    const v2Body = toV2CreateBody(body);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(v2Body),
      timeout: REQUEST_TIMEOUT_MS,
      ...(this.agent && { agent: this.agent }),
    });

    if (response.status === 409) {
      // Rule already exists — fall back to update.
      await this.updateRule(id, toUpdateBodyFromCreate(body));
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `V2 create rule ${id} failed with status ${response.status}: ${text}`
      );
    }
  }

  async updateRule(id: string, body: UpdateRuleBody): Promise<void> {
    const url = `${this.baseUrl}${V2_RULES_BASE_PATH}/${encodeURIComponent(id)}`;
    const v2Body = toV2UpdateBody(body);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(v2Body),
      timeout: REQUEST_TIMEOUT_MS,
      ...(this.agent && { agent: this.agent }),
    });

    if (response.status === 404) {
      // Rule missing — fall back to create.
      await this.createRuleWithoutFallback(id, toCreateBodyFromUpdate(body));
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `V2 update rule ${id} failed with status ${response.status}: ${text}`
      );
    }
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const url = `${this.baseUrl}${V2_RULES_BASE_PATH}/_bulk_delete`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ ids }),
      timeout: REQUEST_TIMEOUT_MS,
      ...(this.agent && { agent: this.agent }),
    });

    if (response.status === 404) {
      this.logger.debug(`V2 bulk delete returned 404 — rules may not have existed yet.`);
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `V2 bulk delete failed with status ${response.status}: ${text}`
      );
    }
  }

  /** POST that tolerates 409 (concurrent writer) — used by updateRule's 404 branch. */
  private async createRuleWithoutFallback(id: string, body: CreateRuleBody): Promise<void> {
    const url = `${this.baseUrl}${V2_RULES_BASE_PATH}/${encodeURIComponent(id)}`;
    const v2Body = toV2CreateBody(body);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(v2Body),
      timeout: REQUEST_TIMEOUT_MS,
      ...(this.agent && { agent: this.agent }),
    });

    if (response.status === 409) {
      this.logger.debug(`V2 create rule ${id} (from 404 fallback) got 409 — concurrent writer won, treating as success.`);
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `V2 create rule ${id} (from update 404 fallback) failed with status ${response.status}: ${text}`
      );
    }
  }
}

/**
 * v1 tags arrive as `['streams', '<streamName>']`. v2 uses a single structured tag
 * `sigevents:stream:<streamName>` so the read side can filter `.rule-events` by stream.
 */
function toV2Tags(v1Tags: string[]): string[] {
  const streamName = v1Tags.find((t) => t !== 'streams');
  return streamName ? [`sigevents:stream:${streamName}`] : v1Tags;
}

/**
 * v2 grouping fields for SigEvents MATCH queries.
 *
 * Each MATCH row corresponds to one source document; using `_id` makes the group hash
 * stable across overlapping evaluation windows (with `lookback: 2m` and `every: 1m`,
 * adjacent runs see the same documents). This mirrors v1's per-document deduplication
 * via `kibana.alert.uuid` derived from `_id`. Without an explicit grouping, v2 falls
 * back to a per-row hash that includes the execution UUID, producing a fresh group on
 * every run and a duplicate signal per document per evaluation.
 *
 * The query passed to v2 retains `METADATA _id` (only `_source` is stripped) so that
 * `_id` is present as a column for v2's `buildGroupHash` to read.
 */
const V2_MATCH_GROUPING_FIELDS = ['_id'] as const;

const V2_QUERY_METADATA_TO_STRIP = ['_source'];

function toV2CreateBody(body: CreateRuleBody) {
  return {
    kind: 'signal' as const,
    metadata: {
      name: body.name,
      tags: toV2Tags(body.tags),
    },
    time_field: body.params.timestampField,
    schedule: { every: body.schedule.interval, lookback: '2m' },
    grouping: { fields: [...V2_MATCH_GROUPING_FIELDS] },
    evaluation: {
      query: { base: stripMetadata(body.params.query, V2_QUERY_METADATA_TO_STRIP) },
    },
  };
}

function toV2UpdateBody(body: UpdateRuleBody) {
  return {
    metadata: {
      name: body.name,
      tags: toV2Tags(body.tags),
    },
    schedule: { every: body.schedule.interval, lookback: '2m' },
    grouping: { fields: [...V2_MATCH_GROUPING_FIELDS] },
    evaluation: {
      query: { base: stripMetadata(body.params.query, V2_QUERY_METADATA_TO_STRIP) },
    },
  };
}

function toUpdateBodyFromCreate(body: CreateRuleBody): UpdateRuleBody {
  return {
    name: body.name,
    actions: [] as never[],
    params: body.params,
    tags: body.tags,
    schedule: body.schedule,
  };
}

/**
 * Reconstructs a CreateRuleBody from an UpdateRuleBody for the update→404→create path.
 * `enabled: true` is intentional: this path is only reached from `installQueries` which
 * runs for queries that the system determined should be active. A missing rule (404) must
 * be recreated in the enabled state to maintain signal continuity.
 */
function toCreateBodyFromUpdate(body: UpdateRuleBody): CreateRuleBody {
  return {
    name: body.name,
    consumer: STREAMS_RULE_CONSUMER,
    alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
    actions: [] as never[],
    params: body.params,
    enabled: true,
    tags: body.tags,
    schedule: body.schedule,
  };
}
