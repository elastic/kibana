/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KI_RETRIEVAL_SKILL_ID = 'ki-retrieval' as const;

/**
 * The single Context Engine authoring skill: it decides what an AI index should hold and produces
 * the automations that fill it, whether the index is new or already misbehaving.
 */
export const ANALYZE_AND_IMPROVE_SKILL_ID = 'analyze-and-improve' as const;
