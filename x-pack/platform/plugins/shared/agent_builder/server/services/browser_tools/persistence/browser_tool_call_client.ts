/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { BrowserToolCallStatus } from '@kbn/agent-builder-common';
import type { BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type {
  BrowserToolCallProperties,
  BrowserToolCallStorage,
} from './browser_tool_call_storage';
import {
  browserToolCallIndexName,
  createBrowserToolCallStorage,
} from './browser_tool_call_storage';

const UPDATE_RETRY_ON_CONFLICT = 3;

export const browserToolCallDocId = (executionId: string, toolCallId: string) =>
  `${executionId}:${toolCallId}`;

export type BrowserToolCallDocument = BrowserToolCallProperties;

/**
 * - `accepted`: the call was pending and is now answered.
 * - `not_found`: no such call.
 * - `rejected`: the call exists but was not answerable (not pending, expired, or another client).
 */
export type AnswerOutcome = 'accepted' | 'not_found' | 'rejected';

export interface BrowserToolCallClient {
  /** Create a pending call document. Fails if it already exists. */
  create(params: {
    executionId: string;
    toolCallId: string;
    clientId?: string;
    spaceId: string;
    toolId: string;
    expiresAt: string;
  }): Promise<void>;

  /** Real-time GET of a call document. Returns undefined if not found. */
  get(executionId: string, toolCallId: string): Promise<BrowserToolCallDocument | undefined>;

  /** Atomically flip a pending, unexpired call to answered and store the result. */
  answer(params: {
    executionId: string;
    toolCallId: string;
    clientId?: string;
    result: BrowserToolResultPayload;
    now?: Date;
  }): Promise<AnswerOutcome>;

  /** Mark a call as consumed or expired. */
  setStatus(
    executionId: string,
    toolCallId: string,
    status: BrowserToolCallStatus.consumed | BrowserToolCallStatus.expired
  ): Promise<void>;

  /** Delete call documents created more than `hours` ago. Returns the number deleted. */
  deleteOlderThan(age: { hours: number }): Promise<number>;
}

// Only pending calls can expire, and only answered calls can be consumed.
const SET_STATUS_SCRIPT = `
  if (params.status == 'expired' && ctx._source.status != 'pending') {
    ctx.op = 'noop';
  } else if (params.status == 'consumed' && ctx._source.status != 'answered') {
    ctx.op = 'noop';
  } else {
    ctx._source.status = params.status;
  }
`;

// `expires_at` is a date string: it must be parsed, comparing strings is not safe.
const ANSWER_SCRIPT = `
  if (
    ctx._source.status != 'pending' ||
    ZonedDateTime.parse(ctx._source.expires_at).toInstant().toEpochMilli() < params.now_ms ||
    (ctx._source.client_id != null && ctx._source.client_id != params.client_id)
  ) {
    ctx.op = 'noop';
  } else {
    ctx._source.status = 'answered';
    ctx._source.result = params.result;
  }
`;

export const createBrowserToolCallClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): BrowserToolCallClient => {
  const storage = createBrowserToolCallStorage({ logger, esClient });
  return new BrowserToolCallClientImpl({ storage, esClient });
};

const isNotFound = (err: unknown): boolean =>
  (err as { meta?: { statusCode?: number } } | undefined)?.meta?.statusCode === 404;

class BrowserToolCallClientImpl implements BrowserToolCallClient {
  private readonly storage: BrowserToolCallStorage;
  private readonly esClient: ElasticsearchClient;

  constructor({
    storage,
    esClient,
  }: {
    storage: BrowserToolCallStorage;
    esClient: ElasticsearchClient;
  }) {
    this.storage = storage;
    this.esClient = esClient;
  }

  async create({
    executionId,
    toolCallId,
    clientId,
    spaceId,
    toolId,
    expiresAt,
  }: Parameters<BrowserToolCallClient['create']>[0]): Promise<void> {
    const document: BrowserToolCallProperties = {
      execution_id: executionId,
      tool_call_id: toolCallId,
      ...(clientId ? { client_id: clientId } : {}),
      space_id: spaceId,
      tool_id: toolId,
      status: BrowserToolCallStatus.pending,
      created_at: new Date().toISOString(),
      // Normalised so the answer script can always parse it (a bare date would make it throw).
      expires_at: new Date(expiresAt).toISOString(),
    };

    // Reads by id are real-time GETs, so there is no need to wait for a refresh.
    await this.storage.getClient().index({
      id: browserToolCallDocId(executionId, toolCallId),
      document,
      op_type: 'create',
      refresh: false,
    });
  }

  async get(executionId: string, toolCallId: string): Promise<BrowserToolCallDocument | undefined> {
    try {
      const response = await this.esClient.get<BrowserToolCallProperties>({
        index: browserToolCallIndexName,
        id: browserToolCallDocId(executionId, toolCallId),
      });
      return response._source;
    } catch (err) {
      if (isNotFound(err)) {
        return undefined;
      }
      throw err;
    }
  }

  async answer({
    executionId,
    toolCallId,
    clientId,
    result,
    now = new Date(),
  }: Parameters<BrowserToolCallClient['answer']>[0]): Promise<AnswerOutcome> {
    try {
      const response = await this.esClient.update({
        index: browserToolCallIndexName,
        id: browserToolCallDocId(executionId, toolCallId),
        refresh: false,
        // On a concurrent answer the script re-runs, sees `answered` and noops (-> rejected).
        retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
        script: {
          lang: 'painless',
          source: ANSWER_SCRIPT,
          params: { now_ms: now.getTime(), client_id: clientId ?? null, result },
        },
      });
      return response.result === 'noop' ? 'rejected' : 'accepted';
    } catch (err) {
      if (isNotFound(err)) {
        return 'not_found';
      }
      throw err;
    }
  }

  async setStatus(
    executionId: string,
    toolCallId: string,
    status: BrowserToolCallStatus.consumed | BrowserToolCallStatus.expired
  ): Promise<void> {
    await this.esClient.update({
      index: browserToolCallIndexName,
      id: browserToolCallDocId(executionId, toolCallId),
      retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
      script: { lang: 'painless', source: SET_STATUS_SCRIPT, params: { status } },
    });
  }

  async deleteOlderThan({ hours }: { hours: number }): Promise<number> {
    const response = await this.esClient.deleteByQuery({
      index: browserToolCallIndexName,
      query: { range: { created_at: { lt: `now-${hours}h` } } },
      conflicts: 'proceed',
      ignore_unavailable: true,
      refresh: false,
    });
    return response.deleted ?? 0;
  }
}
