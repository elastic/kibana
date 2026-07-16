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

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

@injectable()
export class CreateAlertEventRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    summary: 'Create an alert event',
    description:
      'Creates an alert event directly without a backing rule. ' +
      'Intended for external monitoring systems pushing pre-normalized alerts.',
  } as const;
  static schemas = {
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
    const fingerprint = body.fingerprint;
    const inputRuleId = body.rule_id || undefined;
    const inputRuleName = body.rule_name || undefined;
    const alertUrl = body.alert_url || undefined;
    const alertStatus = body.alert_status || undefined;
    const data = body.data;
    const timestamp = body.timestamp || undefined;
    const severity = body.severity || undefined;

    const ruleId = inputRuleId ? `${source}/${inputRuleId}` : source;
    const ruleName = inputRuleName ?? inputRuleId ?? source;

    // group_hash is stable per-series: sha256(derived_rule_id + ":" + fingerprint)
    const groupHash = sha256(`${ruleId}:${fingerprint}`);

    const episodeStatus = alertStatus ?? alertEpisodeStatus.active;

    // Episode continuation: query latest event for this group_hash to decide
    // whether to continue an existing episode or start a new one.
    const episodeId = await this.resolveEpisodeId(groupHash, episodeStatus);

    const atTimestamp = timestamp ?? new Date().toISOString();

    // status: active/pending → breached; inactive/recovering → recovered
    const status =
      episodeStatus === alertEpisodeStatus.inactive || episodeStatus === alertEpisodeStatus.recovering
        ? alertEventStatus.recovered
        : alertEventStatus.breached;

    // status_count must be >= 1 for pending/recovering states
    const statusCount =
      episodeStatus === alertEpisodeStatus.pending || episodeStatus === alertEpisodeStatus.recovering
        ? 1
        : undefined;

    const doc: AlertEvent = {
      '@timestamp': atTimestamp,
      rule: { id: ruleId, name: ruleName, version: 1 },
      group_hash: groupHash,
      data: data ?? {},
      status,
      source: {
        name: source,
        ...(alertUrl != null ? { alert_url: alertUrl } : {}),
      },
      type: alertEventType.alert,
      episode: {
        id: episodeId,
        status: episodeStatus,
        ...(statusCount != null ? { status_count: statusCount } : {}),
      },
      space_id: this.spaceId,
      ...(severity != null ? { severity } : {}),
    };

    await this.storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: [doc],
    });

    return this.ctx.response.created({ body: { id: groupHash } });
  }

  /**
   * Resolve episode ID for this group_hash by querying latest state:
   * - No prior event → new episode (UUID v4)
   * - Prior episode is inactive and new status is non-inactive → new episode (re-open)
   * - Otherwise → continue existing episode
   */
  private async resolveEpisodeId(
    groupHash: string,
    nextStatus: string
  ): Promise<string> {
    try {
      const rows = await this.queryService.executeQueryRows<{
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
}
