/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Session memory types: promoted short-term memories and syntheses of them. */
export const MEMORY_KI_TYPES = ['memory.session', 'memory.session_fact'] as const;

/**
 * Every long-term memory KI type starts with this prefix: the session types above, and the
 * structured types the memory extraction automations write (`memory.fact.<kind>`,
 * `memory.entity.<kind>`, `memory.relationship.<kind>`, `memory.<custom type>`).
 */
export const MEMORY_KI_TYPE_PREFIX = 'memory.';

/** The memory types as an ES|QL `LIKE` pattern. */
export const MEMORY_KI_TYPE_PATTERN = `${MEMORY_KI_TYPE_PREFIX}*`;

export const isMemoryKiType = (type: string): boolean => type.startsWith(MEMORY_KI_TYPE_PREFIX);

/** KI id prefix shared by every memory automation, so the same node is one KI whichever writes it. */
export const MEMORY_KI_ID_PREFIX = 'memory/';
