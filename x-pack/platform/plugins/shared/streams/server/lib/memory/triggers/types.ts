/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InsightClient } from '../../sig_events/insights/client/insight_client';
import type { MemoryService } from '../types';

/**
 * A function that sends a prompt to the LLM and returns the text response.
 * Abstracts whether we're using modelProvider (hooks) or inference client (tasks).
 */
export type OutputFunction = (prompt: string) => Promise<string>;

/**
 * Context passed to a memory update trigger when it executes.
 */
export interface MemoryUpdateContext {
  /** The memory service instance for CRUD operations */
  memory: MemoryService;
  /** Logger scoped to the trigger */
  logger: Logger;
  /** Information about what triggered the update */
  trigger: {
    /** The trigger type identifier */
    type: string;
    /** Arbitrary payload from the triggering event */
    payload: Record<string, unknown>;
  };
  /**
   * Optional LLM output function. When provided, triggers can use it
   * to generate text via the configured model. If absent, triggers that
   * require LLM calls should skip or degrade gracefully.
   */
  output?: OutputFunction;
  /**
   * Bound inference client for reasoning agent triggers.
   * Provides access to chatComplete/prompt with a specific connector.
   */
  inferenceClient?: BoundInferenceClient;
  /**
   * Elasticsearch client for triggers that need to run ES|QL or other queries.
   */
  esClient?: ElasticsearchClient;
  /**
   * Insight client for triggers that need to read insights/KIs.
   */
  insightClient?: InsightClient;
  /**
   * An optional AbortSignal that triggers can check to support task cancellation.
   */
  abortSignal?: AbortSignal;
}

/**
 * A registered memory update trigger that can be invoked when certain events occur.
 */
export interface MemoryUpdateTrigger {
  /** Unique identifier for the trigger */
  id: string;
  /** Human-readable description of when this trigger fires */
  description: string;
  /** Execute the trigger's memory update logic */
  execute: (context: MemoryUpdateContext) => Promise<void>;
}
