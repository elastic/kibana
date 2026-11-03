/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { toBrowserToolDescriptor, type BrowserToolDefinition } from './browser_tool';

/**
 * @deprecated Use `BrowserToolDefinition` instead.
 */
export type BrowserApiToolDefinition<TParams = unknown> = BrowserToolDefinition<TParams>;

export function toToolMetadata<TParams>(
  tool: BrowserApiToolDefinition<TParams>
): BrowserApiToolMetadata {
  return toBrowserToolDescriptor(tool);
}
