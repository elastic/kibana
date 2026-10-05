/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export const TRACE_ATTACHMENT_TYPE = 'investigation_trace' as const;

/** One document per space and conversation. See README "Index naming". */
export const TRACE_INDEX_NAME = '.kibana-investigation-trace' as const;

/** Steps one trace holds. */
export const MAX_TRACE_STEPS = 50;

/**
 * What a step on the route is. The same node types as a Nightshift decision tree, so a trace can
 * be read against, and folded into, the tree for its symptom.
 */
export const TRACE_STEP_TYPES = ['symptom', 'evidence_gatherer', 'decision', 'end'] as const;

/** Agent Builder builtin tool that records an investigation's trace. */
export const SET_TRACE_TOOL_ID = 'investigations.set_trace' as const;
