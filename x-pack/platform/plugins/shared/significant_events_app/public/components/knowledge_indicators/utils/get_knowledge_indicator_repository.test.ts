/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature, StreamQuery } from '@kbn/significant-events-schema';
import { getKnowledgeIndicatorRepository } from './get_knowledge_indicator_repository';

const makeFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'feature-id',
  uuid: 'feature-uuid',
  stream_name: 'logs.test',
  type: 'entity',
  description: 'A feature',
  properties: {},
  confidence: 90,
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeQuery = (overrides: Partial<StreamQuery> = {}): StreamQuery => ({
  id: 'query-id',
  type: 'match',
  title: 'A query',
  description: 'A query description',
  esql: { query: 'FROM logs-*' },
  ...overrides,
});

describe('getKnowledgeIndicatorRepository', () => {
  it('uses a feature repository property when present', () => {
    const knowledgeIndicator: KnowledgeIndicator = {
      kind: 'feature',
      feature: makeFeature({ properties: { repository: 'elastic/kibana' } }),
    };

    expect(getKnowledgeIndicatorRepository(knowledgeIndicator)).toBe('elastic/kibana');
  });

  it('falls back to the feature code evidence', () => {
    const knowledgeIndicator: KnowledgeIndicator = {
      kind: 'feature',
      feature: makeFeature({
        evidence: ['code: open-telemetry/opentelemetry-demo@b74a7bc7:src/main.go:42'],
      }),
    };

    expect(getKnowledgeIndicatorRepository(knowledgeIndicator)).toBe(
      'open-telemetry/opentelemetry-demo'
    );
  });

  it('extracts a query repository from code evidence', () => {
    const knowledgeIndicator: KnowledgeIndicator = {
      kind: 'query',
      query: makeQuery({ evidence: ['code: elastic/kibana@231a2eec:route.ts:967'] }),
      rule: { backed: false, id: 'rule-id' },
      stream_name: 'logs.test',
    };

    expect(getKnowledgeIndicatorRepository(knowledgeIndicator)).toBe('elastic/kibana');
  });
});
