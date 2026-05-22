/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {
    super(ctx);
  }

  protected async execute() {
    const {
      source_id: sourceId,
      episode_id: episodeId,
      data,
      fingerprint,
      timestamp,
      started_at: startedAt,
      ended_at: endedAt,
      episode_status: episodeStatusOverride,
      severity,
    } = this.request.body;

    // sha256(source_id:fingerprint) for consistent series grouping; fall back to episode_id
    const groupHash = sha256(`${sourceId}:${fingerprint ?? episodeId}`);

    // @timestamp: ended_at (recovery point) → explicit timestamp → started_at → now
    const atTimestamp = endedAt ?? timestamp ?? startedAt ?? new Date().toISOString();

    // episode.status: explicit pending/recovering override > ended_at → inactive > default active
    const episodeStatus =
      episodeStatusOverride ?? (endedAt != null ? alertEpisodeStatus.inactive : alertEpisodeStatus.active);

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

    // Merge timing fields into data.* for downstream queryability
    const enrichedData: Record<string, unknown> = { ...data };
    if (startedAt != null) enrichedData.started_at = startedAt;
    if (endedAt != null) enrichedData.ended_at = endedAt;

    const doc: AlertEvent = {
      '@timestamp': atTimestamp,
      rule: { id: sourceId, version: 1 },
      group_hash: groupHash,
      data: enrichedData,
      status,
      source: 'external',
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
}
