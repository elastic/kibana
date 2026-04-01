/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type {
  AgentHeartbeat,
  HeartbeatCreateRequest,
  HeartbeatIntervalUnit,
  HeartbeatUpdateRequest,
} from '../../../../common/heartbeats';
import {
  HEARTBEAT_MAX_INTERVAL_MINUTES,
  HEARTBEAT_MIN_INTERVAL_MINUTES,
  toTaskManagerInterval,
  toTotalMinutes,
} from '../../../../common/heartbeats';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { ConversationService } from '../../conversation';
import { createStorage, type HeartbeatDocument, type HeartbeatStorage } from './storage';
import { heartbeatTaskTypes } from '../task/task_definitions';

/** Internal type alias for a raw ES search hit containing a HeartbeatDocument. */
interface HeartbeatHit {
  _id: string;
  _source?: HeartbeatDocument;
}

/**
 * Low-level heartbeat CRUD client scoped to a specific space and request.
 */
export interface HeartbeatClient {
  get(heartbeatId: string): Promise<AgentHeartbeat>;
  list(agentId: string): Promise<AgentHeartbeat[]>;
  create(agentId: string, body: HeartbeatCreateRequest): Promise<AgentHeartbeat>;
  update(heartbeatId: string, body: HeartbeatUpdateRequest): Promise<AgentHeartbeat>;
  delete(heartbeatId: string): Promise<boolean>;
  /** Cancel the TM task and set status=paused. */
  pause(heartbeatId: string): Promise<AgentHeartbeat>;
  /** Set status=active, schedule a new TM task (fires immediately). */
  resume(heartbeatId: string): Promise<AgentHeartbeat>;
  /** Delete all heartbeats for an agent (called when agent is deleted). */
  deleteByAgentId(agentId: string): Promise<void>;
}

export const createClient = ({
  space,
  request,
  esClient,
  conversationService,
  taskManager,
  logger,
}: {
  space: string;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  conversationService: ConversationService;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): HeartbeatClient => {
  const storage = createStorage({ logger, esClient });
  return new HeartbeatClientImpl({
    storage,
    space,
    request,
    conversationService,
    taskManager,
    logger,
  });
};

class HeartbeatClientImpl implements HeartbeatClient {
  private readonly storage: HeartbeatStorage;
  private readonly space: string;
  private readonly request: KibanaRequest;
  private readonly conversationService: ConversationService;
  private readonly taskManager: TaskManagerStartContract;
  private readonly logger: Logger;

  constructor({
    storage,
    space,
    request,
    conversationService,
    taskManager,
    logger,
  }: {
    storage: HeartbeatStorage;
    space: string;
    request: KibanaRequest;
    conversationService: ConversationService;
    taskManager: TaskManagerStartContract;
    logger: Logger;
  }) {
    this.storage = storage;
    this.space = space;
    this.request = request;
    this.conversationService = conversationService;
    this.taskManager = taskManager;
    this.logger = logger;
  }

  async get(heartbeatId: string): Promise<AgentHeartbeat> {
    const doc = await this._getRawDocument(heartbeatId);
    if (!doc) {
      throw createBadRequestError(`Heartbeat ${heartbeatId} not found`);
    }
    return fromDocument(doc);
  }

  async list(agentId: string): Promise<AgentHeartbeat[]> {
    const docs = await this._listRawDocuments(agentId);
    return docs.map(fromDocument);
  }

  async create(agentId: string, body: HeartbeatCreateRequest): Promise<AgentHeartbeat> {
    validateInterval(body.interval_value, body.interval_unit);

    const now = new Date().toISOString();
    const heartbeatId = uuidv4();

    // Create a dedicated conversation thread for this heartbeat
    const conversationClient = await this.conversationService.getScopedClient({
      request: this.request,
    });
    const conversation = await conversationClient.create({
      agent_id: agentId,
      title: `Heartbeat: ${body.name}`,
      rounds: [],
    });

    // Schedule the recurring Task Manager task, firing at start_time or immediately
    const runAt = body.start_time ? new Date(body.start_time) : new Date();
    const taskId = await this._scheduleTask(
      heartbeatId,
      body.interval_value,
      body.interval_unit,
      runAt
    );

    // Persist the heartbeat document including the task_id
    const document: HeartbeatDocument = {
      id: heartbeatId,
      agent_id: agentId,
      space: this.space,
      name: body.name,
      prompt: body.prompt,
      interval_value: body.interval_value,
      interval_unit: body.interval_unit,
      start_time: body.start_time,
      status: 'active',
      conversation_id: conversation.id,
      task_id: taskId,
      created_at: now,
      updated_at: now,
    };

    await this.storage.getClient().index({ id: heartbeatId, document });

    return fromDocument(document);
  }

  async update(heartbeatId: string, body: HeartbeatUpdateRequest): Promise<AgentHeartbeat> {
    const current = await this._getRawDocument(heartbeatId);
    if (!current) {
      throw createBadRequestError(`Heartbeat ${heartbeatId} not found`);
    }

    const newIntervalValue = body.interval_value ?? current.interval_value;
    const newIntervalUnit = body.interval_unit ?? current.interval_unit;

    if (body.interval_value !== undefined || body.interval_unit !== undefined) {
      validateInterval(newIntervalValue, newIntervalUnit);
    }

    const intervalChanged = body.interval_value !== undefined || body.interval_unit !== undefined;
    const startTimeChanged = body.start_time !== undefined;
    let newTaskId = current.task_id;

    // Reschedule if interval or start_time changed and the heartbeat is active
    if ((intervalChanged || startTimeChanged) && current.status === 'active' && current.task_id) {
      await this._cancelTask(current.task_id);
      const newStartTime = startTimeChanged ? body.start_time : current.start_time;
      const runAt = newStartTime ? new Date(newStartTime) : new Date();
      newTaskId = await this._scheduleTask(heartbeatId, newIntervalValue, newIntervalUnit, runAt);
    }

    const updated: HeartbeatDocument = {
      ...current,
      ...body,
      task_id: newTaskId,
      updated_at: new Date().toISOString(),
    };

    await this.storage.getClient().index({ id: heartbeatId, document: updated });
    return fromDocument(updated);
  }

  async delete(heartbeatId: string): Promise<boolean> {
    const doc = await this._getRawDocument(heartbeatId);
    if (!doc) {
      throw createBadRequestError(`Heartbeat ${heartbeatId} not found`);
    }

    // Cancel TM task if active
    if (doc.task_id) {
      await this._cancelTask(doc.task_id);
    }

    // Remove heartbeat document (conversation is preserved intentionally)
    const result = await this.storage.getClient().delete({ id: heartbeatId });
    return result.result === 'deleted';
  }

  async pause(heartbeatId: string): Promise<AgentHeartbeat> {
    const doc = await this._getRawDocument(heartbeatId);
    if (!doc) {
      throw createBadRequestError(`Heartbeat ${heartbeatId} not found`);
    }

    // Idempotent: already paused
    if (doc.status === 'paused') {
      return fromDocument(doc);
    }

    // Cancel TM task
    if (doc.task_id) {
      await this._cancelTask(doc.task_id);
    }

    const updated: HeartbeatDocument = {
      ...doc,
      status: 'paused',
      task_id: undefined,
      updated_at: new Date().toISOString(),
    };

    await this.storage.getClient().index({ id: heartbeatId, document: updated });
    return fromDocument(updated);
  }

  async resume(heartbeatId: string): Promise<AgentHeartbeat> {
    const doc = await this._getRawDocument(heartbeatId);
    if (!doc) {
      throw createBadRequestError(`Heartbeat ${heartbeatId} not found`);
    }

    // Idempotent: already active
    if (doc.status === 'active') {
      return fromDocument(doc);
    }

    // Schedule a new TM task (fires immediately)
    const taskId = await this._scheduleTask(heartbeatId, doc.interval_value, doc.interval_unit);

    const updated: HeartbeatDocument = {
      ...doc,
      status: 'active',
      task_id: taskId,
      updated_at: new Date().toISOString(),
    };

    await this.storage.getClient().index({ id: heartbeatId, document: updated });
    return fromDocument(updated);
  }

  async deleteByAgentId(agentId: string): Promise<void> {
    const docs = await this._listRawDocuments(agentId);

    await Promise.all(
      docs.map(async (doc) => {
        if (doc.task_id) {
          await this._cancelTask(doc.task_id);
        }
        await this.storage.getClient().delete({ id: doc.id });
      })
    );

    this.logger.debug(`Deleted ${docs.length} heartbeat(s) for agent ${agentId}`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Fetch a heartbeat's raw ES document (includes `task_id` and `space`).
   * Returns `undefined` if not found in this space.
   */
  private async _getRawDocument(heartbeatId: string): Promise<HeartbeatDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { id: heartbeatId } }],
        },
      },
    });

    if (response.hits.hits.length === 0) {
      return undefined;
    }
    const hit = response.hits.hits[0] as HeartbeatHit;
    return hit._source!;
  }

  /**
   * Fetch all raw ES documents for a given agent in this space.
   */
  private async _listRawDocuments(agentId: string): Promise<HeartbeatDocument[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { agent_id: agentId } }],
        },
      },
      sort: [{ created_at: { order: 'asc' } }],
    });

    return (response.hits.hits as HeartbeatHit[]).map((hit) => hit._source!);
  }

  /**
   * Schedule a recurring Task Manager task.
   * @param runAt - When the first execution should fire (defaults to now).
   * Returns the TM task ID.
   */
  private async _scheduleTask(
    heartbeatId: string,
    intervalValue: number,
    intervalUnit: HeartbeatIntervalUnit,
    runAt: Date = new Date()
  ): Promise<string> {
    const taskId = `heartbeat-${heartbeatId}-${Date.now()}`;
    const interval = toTaskManagerInterval(intervalValue, intervalUnit);

    await this.taskManager.schedule(
      {
        id: taskId,
        taskType: heartbeatTaskTypes.runHeartbeat,
        params: { heartbeatId },
        schedule: { interval },
        runAt,
        scope: ['agent-builder'],
        enabled: true,
        state: {},
      },
      { request: this.request }
    );

    this.logger.debug(
      `Scheduled heartbeat task ${taskId} for heartbeat ${heartbeatId} (every ${interval}, first run at ${runAt.toISOString()})`
    );
    return taskId;
  }

  /**
   * Cancel a Task Manager task by ID. Logs a warning if the task doesn't exist.
   */
  private async _cancelTask(taskId: string): Promise<void> {
    try {
      await this.taskManager.removeIfExists(taskId);
      this.logger.debug(`Cancelled heartbeat task ${taskId}`);
    } catch (err) {
      // Log but don't fail — the task may have already run and been removed
      this.logger.warn(`Failed to cancel heartbeat task ${taskId}: ${err.message}`);
    }
  }
}

/**
 * Convert a stored HeartbeatDocument to the public AgentHeartbeat type.
 * Strips the internal `space` and `task_id` fields.
 */
const fromDocument = (source: HeartbeatDocument): AgentHeartbeat => {
  return {
    id: source.id,
    agent_id: source.agent_id,
    name: source.name,
    prompt: source.prompt,
    interval_value: source.interval_value,
    interval_unit: source.interval_unit,
    start_time: source.start_time,
    status: source.status,
    conversation_id: source.conversation_id,
    last_executed_at: source.last_executed_at,
    last_error: source.last_error,
    created_at: source.created_at,
    updated_at: source.updated_at,
  };
};

const validateInterval = (intervalValue: number, intervalUnit: HeartbeatIntervalUnit): void => {
  const totalMinutes = toTotalMinutes(intervalValue, intervalUnit);
  if (intervalValue < 1) {
    throw createBadRequestError('Heartbeat interval must be at least 1.');
  }
  if (totalMinutes < HEARTBEAT_MIN_INTERVAL_MINUTES) {
    throw createBadRequestError(
      `Heartbeat interval must be at least ${HEARTBEAT_MIN_INTERVAL_MINUTES} minute.`
    );
  }
  if (totalMinutes > HEARTBEAT_MAX_INTERVAL_MINUTES) {
    throw createBadRequestError(
      `Heartbeat interval must not exceed 30 days (${HEARTBEAT_MAX_INTERVAL_MINUTES} minutes).`
    );
  }
};
