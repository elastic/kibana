/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

/**
 * Dot-prefixed, hidden data stream used as an append-only audit trail for
 * memory operations. It is NOT the memory lifecycle store — memories live and
 * die in the primary Agent Memory index, not here. The 180-day retention applies
 * only to these audit records.
 *
 * Events written:
 *  - `write`     — a new memory was created or an existing one was superseded
 *  - `tombstone` — soft delete (`deleted: true` applied)
 *  - `expired`   — the reconcile task marked `expired_at` on a memory
 */
export const AGENT_MEMORY_HISTORY_STREAM = '.agent-memory-history';

export const agentMemoryHistoryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    /** The Agent Memory document ID this event relates to. */
    memory_id: mappings.keyword(),
    /** 'write' | 'tombstone' | 'expired' */
    event_type: mappings.keyword(),
    /** Revision number after this operation. */
    revision: mappings.long(),
    space_id: mappings.keyword(),
    author: mappings.keyword(),
    author_kind: mappings.keyword(),
    call_source: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export interface MemoryHistoryRecord {
  '@timestamp': string;
  memory_id: string;
  event_type: 'write' | 'tombstone' | 'expired';
  revision: number;
  space_id: string;
  author: string;
  author_kind: string;
  call_source?: string;
}

export const agentMemoryHistoryStream: DataStreamDefinition<
  typeof agentMemoryHistoryMappings,
  MemoryHistoryRecord & Record<string, unknown>
> = {
  name: AGENT_MEMORY_HISTORY_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '180d' },
    mappings: agentMemoryHistoryMappings,
  },
};
