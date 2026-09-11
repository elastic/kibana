/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexCatalogEntry } from '../../types';
import { getAiIndicesInstructions } from './ai_indices';

const defaultCatalog: AiIndexCatalogEntry[] = [
  {
    id: 'elastic',
    esqlTarget: 'sml-main',
    description: 'Summaries of Kibana resources such as dashboards and connectors.',
  },
];

describe('getAiIndicesInstructions', () => {
  it('renders nothing when AI index instructions are disabled', () => {
    expect(
      getAiIndicesInstructions({
        enabled: false,
        catalog: defaultCatalog,
        spaceId: 'default',
      })
    ).toBe('');
  });

  it('renders nothing for an agent with an empty catalog', () => {
    expect(getAiIndicesInstructions({ enabled: true, catalog: [], spaceId: 'default' })).toBe('');
  });

  it('explains what an AI index is and how it is named', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'default',
    });

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('`ai-index-idx-*`');
    expect(instructions).toContain('`ai-index-ds-*`');
  });

  it('describes KIs as context that may answer directly or lead to another source', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'default',
    });

    expect(instructions).toContain('may answer a question directly');
    expect(instructions).toContain('help locate and use another source');
  });

  it('continues with other relevant sources when KIs do not cover the question', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'default',
    });

    expect(instructions).toContain('Search relevant AI indices before broader retrieval');
    expect(instructions).toContain('continue with other relevant data or tools');
  });

  it('renders each catalog entry with its ES|QL target and description', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'default',
    });

    expect(instructions).toContain('Available to this agent:');
    expect(instructions).toContain(
      '- `sml-main` — Summaries of Kibana resources such as dashboards and connectors.'
    );
  });

  it('renders every catalog entry, including custom AI indices', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: [
        ...defaultCatalog,
        { id: 'my-custom', esqlTarget: 'ai-index-idx-custom', description: 'Support tickets.' },
      ],
      spaceId: 'default',
    });

    expect(instructions).toContain('- `sml-main`');
    expect(instructions).toContain('- `ai-index-idx-custom` — Support tickets.');
  });

  it('omits entries with no ES|QL target from the available list, keeping the resolved ones', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: [...defaultCatalog, { id: 'unresolved-custom' }],
      spaceId: 'default',
    });

    expect(instructions).toContain('Available to this agent:');
    expect(instructions).toContain('- `sml-main`');
    expect(instructions).not.toContain('unresolved-custom');
  });

  it('renders the section without an available list when no entry resolved to a target', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: [{ id: 'unresolved-custom' }],
      spaceId: 'default',
    });

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('FROM ai-index-*');
    expect(instructions).not.toContain('Available to this agent:');
    expect(instructions).not.toContain('unresolved-custom');
  });

  it('renders a target-only line for an entry without a description', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: [{ id: 'bare-id', esqlTarget: 'bare-id' }],
      spaceId: 'default',
    });

    expect(instructions).toContain('- `bare-id`');
    expect(instructions).not.toContain('- `bare-id` —');
  });

  it('names no SML tool, so the section survives their replacement by ES|QL', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'default',
    });

    expect(instructions).toContain('Use `execute_esql` for direct AI-index queries');
    expect(instructions).toContain('follow specialized tool instructions when they apply');
    expect(instructions).not.toContain('sml_');
  });

  it('names the space the conversation runs in', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'marketing',
    });

    expect(instructions).toContain('`marketing`');
  });

  it('renders a query template with a filter that also matches indices that are not space-aware', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'marketing',
    });
    const match = instructions.match(/```json\n(.+)\n```/);
    if (!match) {
      throw new Error('Expected the instructions to contain a JSON query template block');
    }
    const params = JSON.parse(match[1]);

    expect(params).toEqual({
      query: 'FROM ai-index-* | LIMIT 100',
      filter: {
        bool: {
          should: [
            // A document with no privilege entries — including every document of an index that
            // does not map the field — is visible from any space.
            {
              bool: {
                must_not: {
                  nested: {
                    path: 'permissions.kibana.privileges',
                    query: { match_all: {} },
                    ignore_unmapped: true,
                  },
                },
              },
            },
            {
              nested: {
                path: 'permissions.kibana.privileges',
                ignore_unmapped: true,
                query: {
                  bool: {
                    should: [
                      { term: { 'permissions.kibana.privileges.space': 'marketing' } },
                      { term: { 'permissions.kibana.privileges.space': '*' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('tells the agent to adapt the query but copy the filter verbatim', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      catalog: defaultCatalog,
      spaceId: 'marketing',
    });

    expect(instructions).toContain('Adapt the query to the task');
    expect(instructions).toContain('copy the filter verbatim');
  });
});
