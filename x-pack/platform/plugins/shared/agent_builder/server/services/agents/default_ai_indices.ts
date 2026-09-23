/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { smlAiIndexDescription, smlIndexName } from '@kbn/agent-builder-sml-plugin/server';

export interface DefaultAiIndex {
  esqlTarget: string;
  description: string;
}

/**
 * The AI indices every chat agent gets by default, keyed by Context Engine id.
 *
 * Single source of truth: the chat agent type's base configuration is derived from this map's
 * keys, and the system prompt's AI-index catalog is rendered from its values. Adding or removing
 * a default here updates both together, so the configured list and the prompt can never drift.
 */
export const defaultAiIndices: Record<string, DefaultAiIndex> = {
  [agentBuilderDefaultAiIndexId]: {
    esqlTarget: smlIndexName,
    description: smlAiIndexDescription,
  },
};
