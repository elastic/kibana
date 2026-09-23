/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';

/**
 * The root-graph `on_chain_stream` event `streamEvents({ streamMode: 'values' })` emits after a
 * super-step: `chunk` is the full graph state. The root run carries the caller's metadata only
 * (no `langgraph_node`). The state fields persistence reads default to an empty first cycle when
 * `chunk` is an object; pass a non-object `chunk` to build a malformed event.
 */
export const createRootStateChunkEvent = (
  graphName: string,
  chunk: unknown,
  metadata: Record<string, unknown> = {}
): LangchainStreamEvent =>
  ({
    event: 'on_chain_stream',
    name: graphName,
    run_id: 'root-run',
    tags: [],
    metadata: { graphName, ...metadata },
    data: {
      chunk:
        typeof chunk === 'object' && chunk !== null
          ? { currentCycle: 0, errorCount: 0, toolRenderState: {}, ...chunk }
          : chunk,
    },
  } as LangchainStreamEvent);
