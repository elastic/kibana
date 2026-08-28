/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Details for a single AI index, sourced from the Context Engine registry.
 */
export interface AiIndexDetail {
  /** Registry id of the AI index (the value stored in agent `ai_indices` config). */
  id: string;
  /** The ES|QL `FROM` target: an index name, pattern, or comma-separated list. */
  esqlTarget: string;
  description?: string;
}

/**
 * Resolves AI index ids to their details for the requesting user. Registered by the
 * `context_engine_agent_builder` bridge and invoked once per run. Details are authz-sensitive:
 * implementations must enforce the caller's registry access and omit ids they may not see.
 *
 * The resolver enforces only the registry read privilege, not whether Context Engine is enabled;
 * callers must gate on the Context Engine setting themselves before invoking it.
 */
export type AiIndexResolver = (params: {
  ids: string[];
  request: KibanaRequest;
}) => Promise<AiIndexDetail[]>;
