/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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

/** Kibana app path for episode detail — callers prepend origin + basePath as needed. */
const EPISODE_DETAILS_APP_PATH = '/app/management/alertingV2/episodes';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function buildEpisodeUrl(episodeId: string): string {
  return `${EPISODE_DETAILS_APP_PATH}/${encodeURIComponent(episodeId)}`;
}

/**
 * Resolves the fingerprint in priority order:
 *   1. Explicit `fingerprint` field
 *   2. `fingerprint_fields` — hash of named fields (body top-level, then data.*)
 *   3. `rule_id` — hashed with source for a stable per-rule series key
 *
 * `createAlertEventDataSchema` requires one of the three.
 */
function resolveFingerprint(body: CreateAlertEventData, source: string): string {
  if (body.fingerprint) return body.fingerprint;

  if (body.fingerprint_fields?.length) {
    const record = body as CreateAlertEventData & Record<string, unknown>;
    const values = body.fingerprint_fields.map((field) => {
      if (
        field !== 'data' &&
        field !== 'fingerprint_fields' &&
        Object.prototype.hasOwnProperty.call(record, field) &&
        record[field] != null
      ) {
        return String(record[field]);
      }
      return String(body.data?.[field] ?? '');
    });
    return sha256(values.join(':'));
  }

  if (body.rule_id) return sha256(`${source}:${body.rule_id}`);

  throw new Error('Missing fingerprint, fingerprint_fields, or rule_id');
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
   */
  public async ingestAlertEvent({
    source,
    body,
  }: {
    source: string;
    body: CreateAlertEventData;
  }): Promise<CreateAlertEventResponse> {
    const fingerprint = resolveFingerprint(body, source);
    // spaceId scopes the hash to prevent cross-space group_hash collisions.
    const groupHash = sha256(`${this.spaceId}:${source}:${fingerprint}`);

    const episodeStatus = body.alert_status ?? alertEpisodeStatus.active;
    const episodeId = await this.resolveEpisodeId(groupHash, episodeStatus);

    const atTimestamp = body.timestamp ?? new Date().toISOString();

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
      data: body.data ?? {},
      status,
      source,
      type: alertEventType.alert,
      episode: {
        id: episodeId,
        status: episodeStatus,
        ...(statusCount != null ? { status_count: statusCount } : {}),
      },
      space_id: this.spaceId,
      ...(body.severity != null ? { severity: body.severity } : {}),
    };

    await this.storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: [doc],
    });

    return {
      group_hash: groupHash,
      episode_id: episodeId,
      episode_url: buildEpisodeUrl(episodeId),
    };
  }

  private async resolveEpisodeId(groupHash: string, nextStatus: string): Promise<string> {
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
        return uuidv4();
      }

      const { last_episode_id: lastEpisodeId, last_episode_status: lastEpisodeStatus } = rows[0];

      const isNewLifecycle =
        lastEpisodeStatus === alertEpisodeStatus.inactive &&
        nextStatus !== alertEpisodeStatus.inactive;

      return isNewLifecycle ? uuidv4() : lastEpisodeId;
    } catch {
      return uuidv4();
    }
  }
}
