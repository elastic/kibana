/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { MemoryClient } from '../client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Reinforcement boost applied by user confirmation.
 * Stronger than advisory reinforce() from the agent (which uses type-specific rates of 0.05–0.15).
 */
const USER_CONFIRMATION_REINFORCEMENT_BOOST = 0.3;

/**
 * Maximum confidence achievable through user confirmation.
 * Capped below 1.0 to allow room for further validation.
 */
const USER_CONFIRMATION_MAX_CONFIDENCE = 0.95;

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

/**
 * EBT event name for memory reinforcement via user confirmation.
 * The event is emitted via core analytics to keep it consistent with
 * the Agent Builder telemetry framework (analytics_service.ts pattern).
 */
const MEMORY_REINFORCED_EVENT = 'agent_builder_memory_reinforced';

interface MemoryReinforcedEventProps {
  memory_id: string;
  reinforcement_score: number;
  confidence: number;
  source: 'user_confirmation';
}

// ---------------------------------------------------------------------------
// UserConfirmationHandler
// ---------------------------------------------------------------------------

/**
 * Applies the strongest available reinforcement signal to a memory node:
 * explicit user confirmation.
 *
 * This is distinct from the advisory reinforce() tool call the agent can make.
 * User confirmation is always more authoritative because the human is directly
 * vouching for the memory's accuracy.
 *
 * Effects:
 *   - reinforcement_score += 0.3 (clamped to 2.0 max)
 *   - confidence capped at 0.95
 *   - Emits telemetry event `agent_builder_memory_reinforced`
 */
export class UserConfirmationHandler {
  private readonly logger: Logger;
  private readonly analytics?: AnalyticsServiceSetup;

  constructor({ logger, analytics }: { logger: Logger; analytics?: AnalyticsServiceSetup }) {
    this.logger = logger;
    this.analytics = analytics;

    // Register the event type if analytics is available
    if (this.analytics) {
      try {
        this.analytics.registerEventType<MemoryReinforcedEventProps>({
          eventType: MEMORY_REINFORCED_EVENT,
          schema: {
            memory_id: { type: 'keyword', _meta: { description: 'ID of the reinforced memory' } },
            reinforcement_score: {
              type: 'double',
              _meta: { description: 'New reinforcement_score after confirmation' },
            },
            confidence: {
              type: 'double',
              _meta: { description: 'New confidence after confirmation' },
            },
            source: {
              type: 'keyword',
              _meta: { description: 'Source of the reinforcement signal' },
            },
          },
        });
      } catch (err) {
        // Event type may already be registered if handler is instantiated multiple times
        this.logger.debug(
          `UserConfirmationHandler: event type registration skipped — ${(err as Error).message}`
        );
      }
    }
  }

  /**
   * Apply user confirmation reinforcement to a specific memory node.
   *
   * @param memoryId - ID of the memory node to reinforce
   * @param client - Scoped MemoryClient for reading and writing the memory
   * @returns The updated memory node
   */
  async applyUserConfirmation(
    memoryId: string,
    client: MemoryClient
  ): Promise<{ reinforcement_score: number; confidence: number }> {
    // Fetch current state
    const memory = await client.get(memoryId);

    const currentReinforcement = memory.reinforcement_score ?? 0;
    const currentConfidence = memory.confidence ?? 0.5;

    // Apply boost — reinforcement_score can exceed 1.0 (accumulates up to 2.0)
    const newReinforcement = clamp(
      currentReinforcement + USER_CONFIRMATION_REINFORCEMENT_BOOST,
      0,
      2.0
    );

    // Cap confidence at 0.95
    const newConfidence = Math.min(
      clamp(currentConfidence, 0, USER_CONFIRMATION_MAX_CONFIDENCE),
      USER_CONFIRMATION_MAX_CONFIDENCE
    );

    await client.update({
      id: memoryId,
      reinforcement_score: newReinforcement,
      confidence: newConfidence,
      last_reinforced_at: new Date().toISOString(),
    });

    this.logger.debug(
      `UserConfirmationHandler: confirmed memory ${memoryId} — reinforcement ${currentReinforcement.toFixed(3)} → ${newReinforcement.toFixed(3)}, confidence ${currentConfidence.toFixed(3)} → ${newConfidence.toFixed(3)}`
    );

    // Emit telemetry
    this.emitTelemetry(memoryId, newReinforcement, newConfidence);

    return {
      reinforcement_score: newReinforcement,
      confidence: newConfidence,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private emitTelemetry(
    memoryId: string,
    reinforcementScore: number,
    confidence: number
  ): void {
    if (!this.analytics) {
      return;
    }

    try {
      this.analytics.reportEvent<MemoryReinforcedEventProps>(MEMORY_REINFORCED_EVENT, {
        memory_id: memoryId,
        reinforcement_score: reinforcementScore,
        confidence,
        source: 'user_confirmation',
      });
    } catch (err) {
      // Never fail the caller due to telemetry errors
      this.logger.debug(
        `UserConfirmationHandler: failed to emit telemetry — ${(err as Error).message}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
