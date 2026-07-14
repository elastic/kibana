/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enables the Streams memory feature for accumulating knowledge from significant events discovery.
 */
export const SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG = 'streams.significantEventsMemoryEnabled';

/**
 * Sigevents memory data stream backing MemoryServiceImpl.
 */
export const MEMORIES_DATA_STREAM = '.significant_events-memories';

/**
 * Enables the Streams root cause investigation workflow and agent.
 */
export const SIGNIFICANT_EVENTS_INVESTIGATION_ENABLED_FLAG = 'streams.investigationEnabled';
