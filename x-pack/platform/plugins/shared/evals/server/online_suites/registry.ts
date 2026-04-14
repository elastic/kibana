/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnlineSuiteDefinition, OnlineSuiteListItem } from './types';

export class OnlineSuiteRegistry {
  private readonly suites = new Map<string, OnlineSuiteDefinition>();

  register(definition: OnlineSuiteDefinition): void {
    if (!definition.id) {
      throw new Error('Online suite id is required');
    }
    if (this.suites.has(definition.id)) {
      throw new Error(`Online suite with id "${definition.id}" is already registered`);
    }

    this.suites.set(definition.id, definition);
  }

  getAll(): OnlineSuiteDefinition[] {
    return Array.from(this.suites.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getById(id: string): OnlineSuiteDefinition | undefined {
    return this.suites.get(id);
  }

  list(): OnlineSuiteListItem[] {
    return this.getAll().map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    }));
  }
}
