/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildConversationExactSearchFilters } from './exact_search_filters';

describe('buildConversationExactSearchFilters', () => {
  it('returns no clauses without filters', () => {
    expect(buildConversationExactSearchFilters()).toEqual([]);
  });

  it('builds exact template filters', () => {
    expect(
      buildConversationExactSearchFilters({
        template: {
          id: 'triage-template',
          version: 3,
        },
      })
    ).toEqual([
      { term: { 'template.id': 'triage-template' } },
      { term: { 'template.version': 3 } },
    ]);
  });

  it('builds exact extended field filters', () => {
    expect(
      buildConversationExactSearchFilters({
        extendedFields: [
          {
            key: 'priority_as_keyword',
            value: 'high',
          },
          {
            key: 'risk_score_as_long',
            exists: true,
          },
        ],
      })
    ).toEqual([
      { term: { 'extended_fields.priority_as_keyword': 'high' } },
      { exists: { field: 'extended_fields.risk_score_as_long' } },
    ]);
  });

  it('can combine exists and exact value clauses for one field', () => {
    expect(
      buildConversationExactSearchFilters({
        extendedFields: [
          {
            key: 'region_as_keyword',
            exists: true,
            value: 'emea',
          },
        ],
      })
    ).toEqual([
      { exists: { field: 'extended_fields.region_as_keyword' } },
      { term: { 'extended_fields.region_as_keyword': 'emea' } },
    ]);
  });
});
