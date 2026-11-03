/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDispatcher } from './browser_tool_dispatcher';
import type { BrowserToolRegistry } from './browser_tool_registry';

export interface BrowserToolsService {
  registry: BrowserToolRegistry;
  dispatcher: BrowserToolDispatcher;
}
