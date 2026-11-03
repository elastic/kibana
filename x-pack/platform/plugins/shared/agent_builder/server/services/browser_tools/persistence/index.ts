/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createBrowserToolCallClient, browserToolCallDocId } from './browser_tool_call_client';
export type {
  BrowserToolCallClient,
  BrowserToolCallDocument,
  AnswerOutcome,
} from './browser_tool_call_client';
export { browserToolCallIndexName } from './browser_tool_call_storage';
