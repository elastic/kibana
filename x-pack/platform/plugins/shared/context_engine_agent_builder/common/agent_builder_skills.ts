/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KI_RETRIEVAL_SKILL_ID = 'ki-retrieval' as const;

/**
 * Decides what an AI index should hold and whether what it holds is working, whether the index is
 * new or already misbehaving. Read-only on its own: the skills below carry the tools.
 */
export const ANALYZE_AND_IMPROVE_SKILL_ID = 'analyze-and-improve' as const;

/** Chooses and configures the data an AI index draws on, and the corpus filter bounding it. */
export const AI_INDEX_SOURCES_SKILL_ID = 'ai-index-sources' as const;

/**
 * Reads, drafts and runs the workflows that generate KIs. This is where the authoring and
 * execution tools live, so a flow that only diagnoses an index must not ask for it.
 */
export const AI_INDEX_AUTOMATIONS_SKILL_ID = 'ai-index-automations' as const;
