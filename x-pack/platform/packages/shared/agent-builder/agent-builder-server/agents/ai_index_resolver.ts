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
  /** May be a concrete index name, a pattern, or a comma-separated list. */
  esqlTarget: string;
  description?: string;
}

/**
 * Resolves AI index ids to details for the requesting user. Implementations must enforce the
 * caller's registry access and omit ids they may not see. Only the registry read privilege is
 * checked — callers gate on whether Context Engine is enabled.
 */
export type AiIndexResolver = (params: {
  ids: string[];
  request: KibanaRequest;
}) => Promise<AiIndexDetail[]>;
