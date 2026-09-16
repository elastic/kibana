/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sigevents memory standard index backing MemoryServiceImpl.
 * Must carry the `ai-index-idx-` prefix to align with Context Engine dynamic templates.
 */
export const MEMORIES_DATA_STREAM = 'ai-index-idx-significant-events-memories';
