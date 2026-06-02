/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentSuiteDefinition, ExperimentSuiteListItem } from './types';

export class ExperimentSuiteRegistry {
  private readonly suites = new Map<string, ExperimentSuiteDefinition>();

  register(definition: ExperimentSuiteDefinition): void {
    if (!definition.id) {
      throw new Error('Experiment suite id is required');
    }

    this.suites.set(definition.id, definition);
  }

  getAll(): ExperimentSuiteDefinition[] {
    return Array.from(this.suites.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getById(id: string): ExperimentSuiteDefinition | undefined {
    return this.suites.get(id);
  }

  list(): ExperimentSuiteListItem[] {
    return this.getAll().map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
      default_repetitions: s.defaultRepetitions,
    }));
  }
}
