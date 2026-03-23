/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { AgentExecutionService } from '../../execution';
import { createStorage, type HeartbeatDocument, type HeartbeatStorage } from '../client/storage';

/**
 * Dependencies required by the heartbeat task handler.
 */
export interface HeartbeatTaskHandlerDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  executionService: AgentExecutionService;
}

/**
 * The interface the Task Manager task definition calls into.
 */
export interface HeartbeatTaskHandler {
  run(params: { heartbeatId: string; fakeRequest: KibanaRequest }): Promise<void>;
}

export const createHeartbeatTaskHandler = (
  deps: HeartbeatTaskHandlerDeps
): HeartbeatTaskHandler => {
  return new HeartbeatTaskHandlerImpl(deps);
};

class HeartbeatTaskHandlerImpl implements HeartbeatTaskHandler {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly executionService: AgentExecutionService;

  constructor({ logger, esClient, executionService }: HeartbeatTaskHandlerDeps) {
    this.logger = logger;
    this.esClient = esClient;
    this.executionService = executionService;
  }

  async run({
    heartbeatId,
    fakeRequest,
  }: {
    heartbeatId: string;
    fakeRequest: KibanaRequest;
  }): Promise<void> {
    const storage = createStorage({ logger: this.logger, esClient: this.esClient });

    // Load heartbeat document
    const heartbeat = await this._findHeartbeat(storage, heartbeatId);
    if (!heartbeat) {
      // Orphaned task — the heartbeat was deleted. Exit cleanly.
      this.logger.debug(`Heartbeat task fired for unknown heartbeat ${heartbeatId} — skipping`);
      return;
    }

    this.logger.debug(`Running heartbeat ${heartbeatId} (agent: ${heartbeat.agent_id})`);

    // Attempt to execute the agent, retrying once on failure
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this._executeHeartbeatBeat(heartbeat, fakeRequest);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Heartbeat ${heartbeatId} execution failed on attempt ${attempt + 1}: ${err.message}`
        );
      }
    }

    if (lastError) {
      // Both attempts failed — log to the conversation thread and update the heartbeat
      this.logger.error(`Heartbeat ${heartbeatId} failed after retries: ${lastError.message}`);
      await this._handleExecutionFailure(storage, heartbeat, lastError);
    } else {
      // Success — update last_executed_at and clear any previous error
      await this._handleExecutionSuccess(storage, heartbeat);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _executeHeartbeatBeat(
    heartbeat: HeartbeatDocument,
    fakeRequest: KibanaRequest
  ): Promise<void> {
    const { events$ } = await this.executionService.executeAgent({
      request: fakeRequest,
      params: {
        agentId: heartbeat.agent_id,
        conversationId: heartbeat.conversation_id,
        nextInput: { message: heartbeat.prompt },
      },
      useTaskManager: false, // we're already inside a TM task
    });

    // Wait for the execution to complete
    await lastValueFrom(events$);
  }

  /**
   * Find a heartbeat document by its ID (space-agnostic internal lookup).
   */
  private async _findHeartbeat(
    storage: HeartbeatStorage,
    heartbeatId: string
  ): Promise<HeartbeatDocument | undefined> {
    const response = await storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: { term: { id: heartbeatId } },
    });

    if (response.hits.hits.length === 0) {
      return undefined;
    }

    const hit = response.hits.hits[0] as { _source?: HeartbeatDocument };
    return hit._source;
  }

  private async _handleExecutionSuccess(
    storage: HeartbeatStorage,
    heartbeat: HeartbeatDocument
  ): Promise<void> {
    try {
      const updated: HeartbeatDocument = {
        ...heartbeat,
        last_executed_at: new Date().toISOString(),
        last_error: undefined,
        updated_at: new Date().toISOString(),
      };
      await storage.getClient().index({ id: heartbeat.id, document: updated });
    } catch (err) {
      this.logger.warn(`Failed to update heartbeat ${heartbeat.id} after success: ${err.message}`);
    }
  }

  private async _handleExecutionFailure(
    storage: HeartbeatStorage,
    heartbeat: HeartbeatDocument,
    error: Error
  ): Promise<void> {
    // Update the heartbeat document with the error
    try {
      const updated: HeartbeatDocument = {
        ...heartbeat,
        last_error: error.message,
        updated_at: new Date().toISOString(),
      };
      await storage.getClient().index({ id: heartbeat.id, document: updated });
    } catch (updateErr) {
      this.logger.warn(
        `Failed to update heartbeat ${heartbeat.id} error status: ${updateErr.message}`
      );
    }

    // Append an error message to the heartbeat's conversation thread
    await this._appendErrorToConversation(heartbeat.conversation_id, error);
  }

  /**
   * Append a system-level error message to the heartbeat's conversation thread
   * so the user can see the failure inline with the beat history.
   */
  private async _appendErrorToConversation(conversationId: string, error: Error): Promise<void> {
    try {
      const conversationsIndex = chatSystemIndex('conversations');
      const errorRound = {
        id: `error-${Date.now()}`,
        status: 'completed',
        input: {
          message: '[Heartbeat triggered]',
        },
        steps: [],
        response: {
          message: `⚠️ Heartbeat execution failed: ${error.message}`,
        },
        started_at: new Date().toISOString(),
        time_to_first_token: 0,
        time_to_last_token: 0,
        model_usage: {
          connector_id: 'system',
          llm_calls: 0,
          input_tokens: 0,
          output_tokens: 0,
        },
      };

      await this.esClient.update({
        index: conversationsIndex,
        id: conversationId,
        script: {
          source:
            'if (ctx._source.rounds == null) { ctx._source.rounds = []; } ctx._source.rounds.add(params.round); ctx._source.updated_at = params.now;',
          lang: 'painless',
          params: {
            round: errorRound,
            now: new Date().toISOString(),
          },
        },
      });

      this.logger.debug(`Appended error round to conversation ${conversationId}`);
    } catch (err) {
      // Non-fatal: the heartbeat is still active
      this.logger.warn(
        `Failed to append error message to conversation ${conversationId}: ${err.message}`
      );
    }
  }
}
