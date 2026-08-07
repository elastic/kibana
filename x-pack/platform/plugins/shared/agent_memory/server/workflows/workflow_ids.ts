/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MEMORY_WORKFLOW_TYPES, type MemoryWorkflowType } from '@kbn/agent-memory-common';
import {
  AGENT_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  AGENT_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  AGENT_MEMORY_GAP_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * The managed workflow backing each curation type. These are owned by this plugin
 * (`pluginId: 'agentMemory'`) and installed at the global workflow scope, because
 * memory itself is space-agnostic.
 */
export const MEMORY_WORKFLOW_ID_BY_TYPE = {
  consolidation: AGENT_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  conversation_scraper: AGENT_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  gap_detection: AGENT_MEMORY_GAP_DETECTION_WORKFLOW_ID,
} as const satisfies Record<MemoryWorkflowType, string>;

export type MemoryWorkflowId =
  (typeof MEMORY_WORKFLOW_ID_BY_TYPE)[keyof typeof MEMORY_WORKFLOW_ID_BY_TYPE];

export const AGENT_MEMORY_WORKFLOW_IDS: MemoryWorkflowId[] = MEMORY_WORKFLOW_TYPES.map(
  (type) => MEMORY_WORKFLOW_ID_BY_TYPE[type]
);
