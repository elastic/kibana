/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalAnalyzer } from '@kbn/signal-investigation-contract';
import { AnalyzerRegistry } from './analyzer_registry';

const analyzer = (id: string): SignalAnalyzer => ({
  id,
  displayName: id,
  authz: 'apm',
  getApplicability: () => ({ applicable: true }),
  run: async () => ({ leads: [], entities: {}, status: 'no_change' }),
});

describe('AnalyzerRegistry', () => {
  it('rejects a duplicate id', () => {
    const registry = new AnalyzerRegistry();
    registry.register(analyzer('service_change_points'));
    expect(() => registry.register(analyzer('service_change_points'))).toThrow(
      'already registered'
    );
  });

  it('rejects an id that cannot be a route path segment', () => {
    const registry = new AnalyzerRegistry();
    expect(() => registry.register(analyzer('Service Change'))).toThrow('lowercase');
  });
});
