/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser/tools/browser_tool';

/** Registry of browser-side tool handlers, keyed by tool id. */
export class BrowserToolRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly definitions = new Map<string, BrowserToolDefinition<any>>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(def: BrowserToolDefinition<any>): () => void {
    if (this.definitions.has(def.id)) {
      throw new Error(`Browser tool '${def.id}' is already registered`);
    }
    this.definitions.set(def.id, def);
    return () => {
      if (this.definitions.get(def.id) === def) {
        this.definitions.delete(def.id);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(id: string): BrowserToolDefinition<any> | undefined {
    return this.definitions.get(id);
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list(): Array<BrowserToolDefinition<any>> {
    return [...this.definitions.values()];
  }
}
