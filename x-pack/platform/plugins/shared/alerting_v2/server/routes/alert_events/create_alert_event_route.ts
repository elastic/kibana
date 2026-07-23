/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import {
  createAlertEventDataSchema,
  createAlertEventResponseSchema,
  errorResponseSchema,
  type CreateAlertEventData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { StorageServiceInternalToken } from '../../lib/services/storage_service/tokens';
import type { StorageServiceContract } from '../../lib/services/storage_service/storage_service';
import { RequestSpaceIdToken } from '../../lib/services/spaces_service/tokens';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEventStatus,
  alertEpisodeStatus,
  alertEventType,
} from '../../resources/datastreams/alert_events';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { QueryServiceContract } from '../../lib/services/query_service/query_service';
import { QueryServiceInternalToken } from '../../lib/services/query_service/tokens';

// ── Shared schemas ────────────────────────────────────────────────────────────

const sourceParamsSchema = z.object({
  source: z.string().min(1),
});

// ── Shared helpers ────────────────────────────────────────────────────────────

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Resolves the fingerprint in priority order:
 *   1. Explicit `fingerprint` field
 *   2. `fingerprint_fields` — hash of named fields from the `data` block
 *   3. `rule_id` — hashed with source for a stable per-rule series key
 *   4. null → caller must be rejected with 400
 */
function resolveFingerprint(body: CreateAlertEventData, source: string): string | null {
  if (body.fingerprint) return body.fingerprint;

  if (body.fingerprint_fields?.length) {
    const values = body.fingerprint_fields.map((f) => String(body.data?.[f] ?? ''));
    return sha256(values.join(':'));
  }

  if (body.rule_id) return sha256(`${source}:${body.rule_id}`);

  return null;
}

async function resolveEpisodeId(
  queryService: QueryServiceContract,
  groupHash: string,
  nextStatus: string
): Promise<string> {
  try {
    const rows = await queryService.executeQueryRows<{
      last_episode_id: string;
      last_episode_status: string;
    }>({
      query: `FROM ${ALERT_EVENTS_DATA_STREAM}
        | WHERE type == "alert" AND group_hash == "${groupHash}" AND episode.status IS NOT NULL
        | STATS last_episode_id = LAST(episode.id, @timestamp),
                last_episode_status = LAST(episode.status, @timestamp)
          BY group_hash
        | KEEP last_episode_id, last_episode_status
        | LIMIT 1`,
    });

    if (rows.length === 0 || !rows[0].last_episode_id) {
      return randomUUID();
    }

    const { last_episode_id: lastEpisodeId, last_episode_status: lastEpisodeStatus } = rows[0];

    const isNewLifecycle =
      lastEpisodeStatus === alertEpisodeStatus.inactive &&
      nextStatus !== alertEpisodeStatus.inactive;

    return isNewLifecycle ? randomUUID() : lastEpisodeId;
  } catch {
    return randomUUID();
  }
}

async function ingestAlertEvent({
  source,
  fingerprint,
  body,
  spaceId,
  storageService,
  queryService,
}: {
  source: string;
  fingerprint: string;
  body: CreateAlertEventData;
  spaceId: string;
  storageService: StorageServiceContract;
  queryService: QueryServiceContract;
}): Promise<{ group_hash: string; episode_id: string }> {
  const ruleId = body.rule_id ? `${source}/${body.rule_id}` : source;
  const ruleName = body.rule_name ?? body.rule_id ?? source;

  // spaceId scopes the hash to prevent cross-space group_hash collisions.
  const groupHash = sha256(`${spaceId}:${source}:${fingerprint}`);

  const episodeStatus = body.alert_status ?? alertEpisodeStatus.active;
  const episodeId = await resolveEpisodeId(queryService, groupHash, episodeStatus);

  const atTimestamp = body.timestamp ?? new Date().toISOString();

  const status =
    episodeStatus === alertEpisodeStatus.inactive || episodeStatus === alertEpisodeStatus.recovering
      ? alertEventStatus.recovered
      : alertEventStatus.breached;

  const statusCount =
    episodeStatus === alertEpisodeStatus.pending || episodeStatus === alertEpisodeStatus.recovering
      ? 1
      : undefined;

  // Merge rule_name and alert_url into data only when the caller hasn't already
  // set those keys — avoids overwriting explicit caller-provided values.
  const incomingData = body.data ?? {};
  const enrichedData = {
    ...(!('rule_name' in incomingData) && body.rule_name != null
      ? { rule_name: body.rule_name }
      : {}),
    ...(!('alert_url' in incomingData) && body.alert_url != null
      ? { alert_url: body.alert_url }
      : {}),
    ...incomingData,
  };

  const doc: AlertEvent = {
    '@timestamp': atTimestamp,
    rule: { id: ruleId, name: ruleName, version: 1 },
    group_hash: groupHash,
    data: enrichedData,
    status,
    source: { name: source },
    type: alertEventType.alert,
    episode: {
      id: episodeId,
      status: episodeStatus,
      ...(statusCount != null ? { status_count: statusCount } : {}),
    },
    space_id: spaceId,
    ...(body.severity != null ? { severity: body.severity } : {}),
  };

  await storageService.bulkIndexDocs({
    index: ALERT_EVENTS_DATA_STREAM,
    docs: [doc],
  });

  return { group_hash: groupHash, episode_id: episodeId };
}

// ── Shared route config ───────────────────────────────────────────────────────

const sharedSecurity: RouteSecurity = {
  authz: {
    requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
  },
};

const sharedRouteOptions = {
  summary: 'Create an alert event',
  description:
    'Creates an alert event directly without a backing rule. ' +
    'Intended for external monitoring systems pushing pre-normalized alerts.',
} as const;

const sharedSchemas = {
  request: {
    body: createAlertEventDataSchema,
  },
  response: {
    201: {
      body: () => createAlertEventResponseSchema,
      description: 'Indicates a successful call.',
    },
    400: {
      body: () => errorResponseSchema,
      description: 'Indicates an invalid schema or parameters.',
    },
  },
};

// ── Route: POST /api/alerting/v2/alerts  (source in body) ────────────────────

@injectable()
export class CreateAlertEventRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}`;
  static security = sharedSecurity;
  static routeOptions = sharedRouteOptions;
  static schemas = sharedSchemas;

  protected readonly routeName = 'create alert event';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest<unknown, unknown, CreateAlertEventData>,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {
    super(ctx);
  }

  protected async execute() {
    const body = this.request.body;
    const source = body.source;

    if (!source) {
      return this.ctx.response.badRequest({
        body: { message: 'source is required (body field or /:source URL path)' },
      });
    }

    const fingerprint = resolveFingerprint(body, source);
    if (!fingerprint) {
      return this.ctx.response.badRequest({
        body: {
          message:
            'one of fingerprint, fingerprint_fields, or rule_id is required to establish a stable series identity',
        },
      });
    }

    const result = await ingestAlertEvent({
      source,
      fingerprint,
      body,
      spaceId: this.spaceId,
      storageService: this.storageService,
      queryService: this.queryService,
    });

    return this.ctx.response.created({ body: result });
  }
}

// ── Route: POST /api/alerting/v2/alerts/:source  (source in URL path) ────────

@injectable()
export class CreateAlertEventBySourceRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}/{source}`;
  static security = sharedSecurity;
  static routeOptions = sharedRouteOptions;
  static schemas = {
    request: {
      params: sourceParamsSchema,
      body: createAlertEventDataSchema,
    },
    response: sharedSchemas.response,
  };

  protected readonly routeName = 'create alert event by source';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof sourceParamsSchema>,
      unknown,
      CreateAlertEventData
    >,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {
    super(ctx);
  }

  protected async execute() {
    const source = this.request.params.source;
    const body = this.request.body;

    const fingerprint = resolveFingerprint(body, source);
    if (!fingerprint) {
      return this.ctx.response.badRequest({
        body: {
          message:
            'one of fingerprint, fingerprint_fields, or rule_id is required to establish a stable series identity',
        },
      });
    }

    const result = await ingestAlertEvent({
      source,
      fingerprint,
      body,
      spaceId: this.spaceId,
      storageService: this.storageService,
      queryService: this.queryService,
    });

    return this.ctx.response.created({ body: result });
  }
}
