/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_MEMORY_GET_PAGE_TOOL_ID = 'platform.streams.memory.get_page';
export const STREAMS_MEMORY_SEARCH_PAGES_TOOL_ID = 'platform.streams.memory.search_pages';
export const STREAMS_MEMORY_LIST_PAGES_TOOL_ID = 'platform.streams.memory.list_pages';
export const STREAMS_MEMORY_GET_INSIGHTS_TOOL_ID = 'platform.streams.memory.get_insights';
export const STREAMS_MEMORY_WRITE_PAGE_TOOL_ID = 'platform.streams.memory.write_page';

export const STREAMS_MEMORY_TOOL_IDS = [
  STREAMS_MEMORY_GET_PAGE_TOOL_ID,
  STREAMS_MEMORY_SEARCH_PAGES_TOOL_ID,
  STREAMS_MEMORY_LIST_PAGES_TOOL_ID,
  STREAMS_MEMORY_GET_INSIGHTS_TOOL_ID,
  STREAMS_MEMORY_WRITE_PAGE_TOOL_ID,
] as const;
