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
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  alertEventStatus,
  alertEpisodeStatus,
  alertEventType,
  ALERT_EVENTS_RESOURCE_KEY,
  type AlertEpisodeStatus,
  type AlertEventDocument,
} from '../../resources/datastreams/alert_events';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  AlertStatusChangedEventPublisher,
  type AlertStatusChangedEventPublisherContract,
} from '../events/alert_status_changed_event_publisher/alert_status_changed_event_publisher';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import {
  ResourceManager,
  type ResourceManagerContract,
} from '../services/resource_service/resource_manager';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/** Path format: dotted keys, e.g. `monitor_id`, `labels.env`. */
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
 * Computes `group_hash` in priority order:
 *   1. Explicit `fingerprint`
 *   2. `fingerprint_fields` — keys/paths resolved only under `data` (missing → "")
 *   3. `rule_id` (schema guarantees one of the three)
 *
 * Always includes `spaceId` and `source` so series keys cannot collide across spaces or sources.
 */
export function getGroupHash(event: CreateAlertEventData, spaceId: string): string {
  const { source } = event;

  if (event.fingerprint) {
    return sha256(`${spaceId}:${source}:${event.fingerprint}`);
  }

  if (event.fingerprint_fields?.length) {
    const data = event.data ?? {};
    // Encode as [[field, value], ...] pairs so field names or values containing
    // the delimiter character cannot produce hash collisions across different inputs.
    const pairs = event.fingerprint_fields.map((field) => {
      const value = getValueByDottedPath(data, field);
      return [field, value == null ? '' : String(value)];
    });
    return sha256(`${spaceId}:${source}:${JSON.stringify(pairs)}`);
  }

  // Schema requires fingerprint, fingerprint_fields, or rule_id.
  return sha256(`${spaceId}:${source}:${event.rule_id}`);
}

interface ResolvedEpisode {
  readonly episodeId: string;
  /** Last status of the series, or `null` when it has none yet. */
  readonly previousStatus: AlertEpisodeStatus | null;
}

@injectable()
export class AlertEventsClient {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(ResourceManager) private readonly resourceManager: ResourceManagerContract,
    @inject(AlertStatusChangedEventPublisher)
    private readonly alertStatusChangedPublisher: AlertStatusChangedEventPublisherContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('events');
  }

  public async createAlertEvent(
    event: CreateAlertEventData,
    { abortSignal }: { abortSignal?: AbortSignal } = {}
  ): Promise<CreateAlertEventResponse> {
    const { source } = event;
    const groupHash = getGroupHash(event, this.spaceId);

    const episodeStatus = event.alert_status ?? alertEpisodeStatus.active;
    const { episodeId, previousStatus } = await this.resolveEpisode(
      groupHash,
      episodeStatus,
      abortSignal
    );

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

    // No `rule` object — no backing rule saved object. A caller-supplied timestamp is
    // honored as `@timestamp`; otherwise ES sets it at ingest.
    const doc: AlertEventDocument = {
      ...(event.timestamp != null ? { '@timestamp': event.timestamp } : {}),
      scheduled_timestamp: event.timestamp ?? new Date().toISOString(),
      group_hash: groupHash,
      data: event.data ?? {},
      status,
      source,
      type: alertEventType.alert,
      alert: {
        id: episodeId,
        status: episodeStatus,
        ...(statusCount != null ? { status_count: statusCount } : {}),
      },
      space_id: this.spaceId,
      ...(event.severity != null ? { severity: event.severity } : {}),
    };

    // The doc may omit `@timestamp`, so the ingest pipeline must be in place before writing.
    await this.resourceManager.ensureResourceReady(ALERT_EVENTS_RESOURCE_KEY);

    // `refresh: 'wait_for'` ensures the written doc is visible to the next
    // resolveEpisode query when events for the same series arrive back-to-back.
    const { errors } = await this.storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: [doc],
      refresh: 'wait_for',
    });

    if (errors.length > 0) {
      const first = errors[0];
      throw Boom.badData(`Failed to persist alert event: ${first.message}`, {
        code: first.code,
        details: first.details,
      });
    }

    // Same as the rule executor: only a genuine status change fires the trigger.
    if (previousStatus !== episodeStatus) {
      await this.publishAlertStatusChange({
        source,
        groupHash,
        episodeId,
        status: episodeStatus,
        previousStatus,
      });
    }

    return {
      group_hash: groupHash,
      alert_id: episodeId,
    };
  }

  /**
   * Publishes the status change of a stored alert event. The write already
   * succeeded, so a failure here is logged rather than thrown.
   */
  private async publishAlertStatusChange({
    source,
    groupHash,
    episodeId,
    status,
    previousStatus,
  }: {
    source: string;
    groupHash: string;
    episodeId: string;
    status: AlertEpisodeStatus;
    previousStatus: AlertEpisodeStatus | null;
  }): Promise<void> {
    try {
      await this.alertStatusChangedPublisher.publishAlertStatusChanges([
        {
          spaceId: this.spaceId,
          source,
          alert: { id: episodeId, groupHash, status, previousStatus },
          rule: null,
          execution: null,
        },
      ]);
    } catch (error) {
      this.logger.warn({
        message: 'Failed to publish alert status change',
        error,
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
        labels: { space_id: this.spaceId, group_hash: groupHash, alert_id: episodeId },
      });
    }
  }

  private async resolveEpisode(
    groupHash: string,
    nextStatus: AlertEpisodeStatus,
    abortSignal?: AbortSignal
  ): Promise<ResolvedEpisode> {
    const rows = await this.queryService.executeQueryRows<{
      last_episode_id: string;
      last_episode_status: AlertEpisodeStatus;
    }>({
      query: `FROM ${ALERT_EVENTS_DATA_STREAM}
          | WHERE type == "alert" AND group_hash == "${groupHash}" AND alert.status IS NOT NULL
          | STATS last_episode_id = LAST(alert.id, @timestamp),
                  last_episode_status = LAST(alert.status, @timestamp)
            BY group_hash
          | KEEP last_episode_id, last_episode_status
          | LIMIT 1`,
      abortSignal,
    });

    const [row] = rows;
    const previousStatus = row?.last_episode_status ?? null;

    if (!row?.last_episode_id) {
      return { episodeId: uuidv4(), previousStatus };
    }

    const isNewLifecycle =
      previousStatus === alertEpisodeStatus.inactive && nextStatus !== alertEpisodeStatus.inactive;

    return { episodeId: isNewLifecycle ? uuidv4() : row.last_episode_id, previousStatus };
  }
}
