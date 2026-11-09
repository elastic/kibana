/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalAnalyzer } from '@kbn/signal-investigation-contract';

const ANALYZER_ID = /^[a-z0-9_]+$/;

export class AnalyzerRegistry {
  private readonly analyzers = new Map<string, SignalAnalyzer>();

  public assertCanRegister(analyzer: SignalAnalyzer): void {
    if (!ANALYZER_ID.test(analyzer.id)) {
      throw new Error(
        `Analyzer id "${analyzer.id}" must contain only lowercase letters, digits, and underscores`
      );
    }
    if (this.analyzers.has(analyzer.id)) {
      throw new Error(`Analyzer "${analyzer.id}" is already registered`);
    }
  }

  public register(analyzer: SignalAnalyzer): void {
    this.assertCanRegister(analyzer);
    this.analyzers.set(analyzer.id, analyzer);
  }

  public get(id: string): SignalAnalyzer | undefined {
    return this.analyzers.get(id);
  }

  public list(): SignalAnalyzer[] {
    return [...this.analyzers.values()];
  }
}
