/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  getExtractionRunsDataStreamName,
  getSystemEventsDataStreamName,
} from '../../../common/domain/system_events';
import { getErrorMessage } from '../../../common';
import { ensureSystemEventsStreamsOnce } from './ensure_system_events_streams';
import type { LifecycleEventInput, RunEventInput, SystemEventDoc } from './types';
import { SYSTEM_EVENT_ACTION } from './types';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export const truncateErrorMessage = (error: unknown): string =>
  getErrorMessage(error).substring(0, MAX_ERROR_MESSAGE_LENGTH);

const MS_TO_NS = 1_000_000;

/** Builds a run doc (`event.kind: run`) from the run's input. */
export const buildRunDoc = (namespace: string, input: RunEventInput): SystemEventDoc => {
  const endedAt = input.endedAt ?? Date.now();
  return {
    '@timestamp': new Date(input.startedAt).toISOString(),
    event: {
      kind: 'run',
      action: input.action,
      outcome: input.outcome,
      ...(input.reason ? { reason: input.reason } : {}),
      duration: Math.max(0, endedAt - input.startedAt) * MS_TO_NS,
    },
    ...(input.error !== undefined ? { error: { message: truncateErrorMessage(input.error) } } : {}),
    entity_store: {
      namespace,
      trigger: input.trigger,
      ...(input.taskType ? { task_type: input.taskType } : {}),
      ...(input.executionUuid ? { execution_uuid: input.executionUuid } : {}),
      ...(input.entityType ? { entity_type: input.entityType } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.maintainerId ? { maintainer_id: input.maintainerId } : {}),
      ...(input.extraction ? { extraction: input.extraction } : {}),
      ...(input.historySnapshot ? { history_snapshot: input.historySnapshot } : {}),
    },
  };
};

/** Builds a lifecycle doc (`event.kind: lifecycle`). */
export const buildLifecycleDoc = (
  namespace: string,
  input: LifecycleEventInput,
  now: Date = new Date()
): SystemEventDoc => ({
  '@timestamp': now.toISOString(),
  event: {
    kind: 'lifecycle',
    action: input.action,
    outcome: input.outcome,
    ...(input.reason ? { reason: input.reason } : {}),
  },
  ...(input.error !== undefined ? { error: { message: truncateErrorMessage(input.error) } } : {}),
  entity_store: {
    namespace,
    trigger: input.trigger,
    ...(input.entityType ? { entity_type: input.entityType } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.maintainerId ? { maintainer_id: input.maintainerId } : {}),
  },
});

/**
 * Writes Entity Store system events: task runs, lifecycle events and daily summaries.
 * Every method is best-effort. A failed write is logged and never thrown, so it cannot fail
 * the run or action it describes.
 */
export class SystemEventsWriter {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly namespace: string;

  constructor({
    esClient,
    logger,
    namespace,
  }: {
    /** Internal user client: viewers read these streams, so writes must not depend on the caller. */
    esClient: ElasticsearchClient;
    logger: Logger;
    namespace: string;
  }) {
    this.esClient = esClient;
    this.logger = logger;
    this.namespace = namespace;
  }

  /** Writes one run doc. Extraction runs go to the short-lived extraction_runs stream. */
  public async writeRun(input: RunEventInput): Promise<void> {
    const dataStream =
      input.action === SYSTEM_EVENT_ACTION.extraction
        ? getExtractionRunsDataStreamName(this.namespace)
        : getSystemEventsDataStreamName(this.namespace);
    await this.write(dataStream, buildRunDoc(this.namespace, input));
  }

  /** Writes one lifecycle doc to the events stream. */
  public async writeLifecycle(input: LifecycleEventInput): Promise<void> {
    await this.writeEvent(buildLifecycleDoc(this.namespace, input));
  }

  /**
   * Writes one doc to the events stream. With `id`, a doc that already exists is left as is,
   * and the method returns false.
   */
  public async writeEvent(doc: SystemEventDoc, id?: string): Promise<boolean> {
    return this.write(getSystemEventsDataStreamName(this.namespace), doc, id);
  }

  private async write(dataStream: string, doc: SystemEventDoc, id?: string): Promise<boolean> {
    try {
      if (!(await ensureSystemEventsStreamsOnce(this.esClient, this.namespace, this.logger))) {
        return false;
      }
      await this.esClient.index({
        index: dataStream,
        id,
        op_type: 'create',
        require_data_stream: true,
        document: doc,
      });
      return true;
    } catch (error) {
      if (id && (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 409) {
        return false;
      }
      this.logger.warn(
        `Failed to write ${doc.event.kind} event "${
          doc.event.action
        }" to ${dataStream}: ${getErrorMessage(error)}`
      );
      return false;
    }
  }
}
