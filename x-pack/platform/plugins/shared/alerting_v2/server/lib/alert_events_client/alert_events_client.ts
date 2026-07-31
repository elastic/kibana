/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { inject, injectable } from 'inversify';
import type { CreateAlertEventData, CreateAlertEventResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEventStatus,
  alertEpisodeStatus,
  alertEventType,
  type AlertEvent,
} from '../../resources/datastreams/alert_events';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Keep-style dotted path lookup on the normalized create-alert payload.
 * Examples: `rule_id`, `data.monitor_id`, `data.labels.env`.
 * Bare names do not magically fall through into `data`.
 */
export function getValueByDottedPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Computes `group_hash` in a single sha256, in priority order:
 *   1. Explicit `fingerprint`
 *   2. `fingerprint_fields` — field names + dotted-path values on the payload
 *   3. `rule_id` (schema guarantees one of the three)
 *
 * Always includes `spaceId` and `source` so series keys cannot collide across
 * spaces or vendors.
 */
function getGroupHash(event: CreateAlertEventData, spaceId: string): string {
  const { source } = event;

  if (event.fingerprint) {
    return sha256(`${spaceId}:${source}:${event.fingerprint}`);
  }

  if (event.fingerprint_fields?.length) {
    const keyPart = event.fingerprint_fields.join('|');
    const valuePart = event.fingerprint_fields
      .map((field) => {
        const value = getValueByDottedPath(event, field);
        return value == null ? '' : String(value);
      })
      .join('|');
    return sha256(`${spaceId}:${source}:${keyPart}|${valuePart}`);
  }

  // Schema requires fingerprint, fingerprint_fields, or rule_id.
  return sha256(`${spaceId}:${source}:${event.rule_id}`);
}

@injectable()
export class AlertEventsClient {
  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  /**
   * Ingests an external alert event into `.rule-events` (no backing rule SO).
   * Shared by POST /api/alerting/v2/alerts and POST /api/alerting/v2/alerts/:source.
   * Callers must pass a normalized payload with `source` already set.
   */
  public async ingestAlertEvent(event: CreateAlertEventData): Promise<CreateAlertEventResponse> {
    const { source } = event;
    const groupHash = getGroupHash(event, this.spaceId);

    const episodeStatus = event.alert_status ?? alertEpisodeStatus.active;
    const episodeId = await this.resolveEpisodeId(groupHash, episodeStatus);

    const atTimestamp = event.timestamp ?? new Date().toISOString();

    const status =
      episodeStatus === alertEpisodeStatus.inactive ||
      episodeStatus === alertEpisodeStatus.recovering
        ? alertEventStatus.recovered
        : alertEventStatus.breached;

    const statusCount =
      episodeStatus === alertEpisodeStatus.pending ||
      episodeStatus === alertEpisodeStatus.recovering
        ? 1
        : undefined;

    // No `rule` object — external alerts have no saved object. Display name /
    // backlink live in data.rule_name / data.alert_url when the caller provides them.
    const doc: AlertEvent = {
      '@timestamp': atTimestamp,
      scheduled_timestamp: atTimestamp,
      group_hash: groupHash,
      data: event.data ?? {},
      status,
      source,
      type: alertEventType.alert,
      episode: {
        id: episodeId,
        status: episodeStatus,
        ...(statusCount != null ? { status_count: statusCount } : {}),
      },
      space_id: this.spaceId,
      ...(event.severity != null ? { severity: event.severity } : {}),
    };

    const { errors } = await this.storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: [doc],
    });

    if (errors.length > 0) {
      const first = errors[0];
      throw Boom.badData(`Failed to persist alert event: ${first.message}`, {
        code: first.code,
        details: first.details,
      });
    }

    return {
      group_hash: groupHash,
      episode_id: episodeId,
    };
  }

  private async resolveEpisodeId(groupHash: string, nextStatus: string): Promise<string> {
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
      return uuidv4();
    }

    const { last_episode_id: lastEpisodeId, last_episode_status: lastEpisodeStatus } = rows[0];

    const isNewLifecycle =
      lastEpisodeStatus === alertEpisodeStatus.inactive &&
      nextStatus !== alertEpisodeStatus.inactive;

    return isNewLifecycle ? uuidv4() : lastEpisodeId;
  }
}
