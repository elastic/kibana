/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file -- V2RulesUnavailableAdapter is the no-plugin stub paired with V2RulesAdapter */

import { isBoom } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { stripMetadata } from '@kbn/streams-schema';
import {
  STREAMS_RULE_CONSUMER,
  STREAMS_ESQL_RULE_TYPE_ID,
  type CreateRuleBody,
  type IRulesManagementClient,
  type UpdateRuleBody,
} from './rules_management_client';

/**
 * Wraps alerting_v2 `RulesClientApi` to implement IRulesManagementClient.
 *
 * create/update handle their own 409/404 fallbacks internally so QueryClient does not
 * need to know which framework is in use.
 *
 * Space context: the caller must obtain the client with the intended space
 * (SigEvents uses default space), matching the former HTTP client behavior.
 */
export class V2RulesAdapter implements IRulesManagementClient {
  constructor(private readonly rulesClient: RulesClientApi, private readonly logger: Logger) {}

  async createRule(id: string, body: CreateRuleBody): Promise<void> {
    await this.rulesClient
      .createRule({ data: toV2CreateBody(body), options: { id } })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          return this.updateRule(id, toUpdateBodyFromCreate(body));
        }
        throw error;
      });
  }

  async updateRule(id: string, body: UpdateRuleBody): Promise<void> {
    await this.rulesClient.updateRule({ id, data: toV2UpdateBody(body) }).catch((error) => {
      if (isBoom(error) && error.output.statusCode === 404) {
        return this.createRuleWithoutFallback(id, toCreateBodyFromUpdate(body));
      }
      throw error;
    });
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { errors } = await this.rulesClient.bulkDeleteRules({ ids });
    const fatal = errors.filter((e) => e.error.statusCode !== 404);
    if (fatal.length > 0) {
      const detail = fatal.map((e) => `${e.id}: ${e.error.message}`).join('; ');
      throw new Error(`V2 bulk delete failed for ${fatal.length} rule(s): ${detail}`);
    }
  }

  /** Create that tolerates 409 (concurrent writer) — used by updateRule's 404 branch. */
  private async createRuleWithoutFallback(id: string, body: CreateRuleBody): Promise<void> {
    await this.rulesClient
      .createRule({ data: toV2CreateBody(body), options: { id } })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          this.logger.debug(
            `V2 create rule ${id} (from 404 fallback) got 409 — concurrent writer won, treating as success.`
          );
          return;
        }
        throw error;
      });
  }
}

/**
 * Used when the alerting v2 plugin is not installed: `DualCleanupRulesAdapter` still needs
 * a secondary client reference shape; v2 cleanup becomes a no-op.
 */
export class V2RulesUnavailableAdapter implements IRulesManagementClient {
  constructor(private readonly logger: Logger) {}

  async createRule(): Promise<void> {
    throw new Error('Alerting v2 plugin is not available');
  }

  async updateRule(): Promise<void> {
    throw new Error('Alerting v2 plugin is not available');
  }

  async bulkDeleteRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    this.logger.debug(
      `Skipping v2 rule cleanup for ${ids.length} id(s): alerting v2 plugin is not available.`
    );
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
