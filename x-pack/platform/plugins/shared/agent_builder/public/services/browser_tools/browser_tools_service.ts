/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';

/**
 * Internal service maintaining a registry of browser API tools, keyed by tool id.
 *
 * Tools registered here are merged into every conversation surface (standalone app
 * and embedded hosts), in addition to any tools the embed host passes as props.
 */
export class BrowserToolsService {
  private readonly registry: Map<string, BrowserApiToolDefinition<any>> = new Map();

  /**
   * Registers a browser API tool.
   *
   * @throws Error if a tool with the same id is already registered.
   */
  register(tool: BrowserApiToolDefinition<any>): void {
    if (this.registry.has(tool.id)) {
      throw new Error(`Browser tool "${tool.id}" is already registered.`);
    }
    this.registry.set(tool.id, tool);
  }

  /**
   * Returns all registered browser API tools.
   */
  getBrowserTools(): Array<BrowserApiToolDefinition<any>> {
    return Array.from(this.registry.values());
  }
}
