/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Resolved details for a single AI index, sourced from the AI index registry
 * (Context Engine). Used to describe configured AI indices in agent prompts.
 */
export interface AiIndexDetail {
  /** Registry id of the AI index (the value stored in agent `ai_indices` config). */
  id: string;
  /**
   * Human-friendly name of the index — the ES|QL `FROM` target
   * (may be an index name, pattern, or comma-separated list).
   */
  name: string;
  /** Optional description of the index contents. */
  description?: string;
}

/**
 * Resolves AI index ids to their details, on behalf of the given request's user.
 *
 * Registered by the `context_engine_agent_builder` bridge plugin at setup time,
 * and invoked once per agent run to describe configured AI indices in the
 * system prompt. Implementations must enforce the caller's access to the
 * registry (details are authz-sensitive) and should return details for the ids
 * the caller may see, silently omitting the rest.
 */
export type AiIndexResolver = (params: {
  ids: string[];
  request: KibanaRequest;
}) => Promise<AiIndexDetail[]>;
