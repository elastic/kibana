/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import { loggerMock } from '@kbn/logging-mocks';
import type { StoredMemoryDocument } from '../memory_document';
import { proposeLinkOperations } from './link_operations';
import { findLinks } from './links';
import { RELATIONSHIP_MEMORY_TYPE } from './relationship_type';

jest.mock('./links', () => ({ findLinks: jest.fn() }));

const findLinksMock = jest.mocked(findLinks);

const NOW = '2026-10-02T00:00:00.000Z';

const memory = (
  id: string,
  type: string,
  title: string,
  attributes: StoredMemoryDocument['attributes'] = {}
): StoredMemoryDocument => ({
  '@timestamp': NOW,
  id,
  type,
  title,
  description: `${title}.`,
  content: '',
  updated_at: NOW,
  attributes,
});

const team = memory('team-1', 'memory.entity', 'Inference Platform', {
  'entity.kind': 'team',
  'memory.key': 'team:inference-platform',
});
const service = memory('service-1', 'memory.entity', 'perf-canary', {
  'entity.kind': 'service',
  'memory.key': 'service:perf-canary',
  'entity.aliases': ['perf canary'],
});
const otherTeam = memory('team-2', 'memory.entity', 'Runtime', { 'entity.kind': 'team' });

const link = (id: string, fromId: string, relation: string, toId: string) => ({
  ...memory(id, 'memory.relationship', `${fromId} ${relation} ${toId}`, {
    'relationship.relation': relation,
  }),
  references: [
    { uri: `ki://long-term-memory/${fromId}`, relation: 'relates_to', description: 'from' },
    { uri: `ki://long-term-memory/${toId}`, relation: 'relates_to', description: 'to' },
  ],
});

const searchResults = (...lists: Array<Array<[StoredMemoryDocument, number]>>) => ({
  responses: lists.map((hits) => ({
    hits: { hits: hits.map(([source, score]) => ({ _source: source, _score: score })) },
  })),
});

describe('proposeLinkOperations', () => {
  let msearch: jest.Mock;
  let outputs: Record<string, unknown>;
  const output = jest.fn();

  const propose = (params: {
    candidates?: StoredMemoryDocument[];
    links?: StoredMemoryDocument[];
  }) =>
    proposeLinkOperations({
      esClient: { msearch } as unknown as ElasticsearchClient,
      inferenceClient: { output } as unknown as InferenceClient,
      connectorId: 'connector',
      spaceId: 'team-a',
      definition: RELATIONSHIP_MEMORY_TYPE,
      sessions: new Map([['session-1', [memory('s1', 'memory.session_fact', 'A note')]]]),
      candidates: params.candidates ?? [],
      links: params.links ?? [],
      now: NOW,
      logger: loggerMock.create(),
    });

  const calledSteps = () => output.mock.calls.map(([{ id }]) => id);

  beforeEach(() => {
    jest.clearAllMocks();
    msearch = jest.fn();
    findLinksMock.mockResolvedValue([]);
    outputs = {};
    output.mockImplementation(async ({ id }: { id: string }) => ({
      output: outputs[id] ?? {},
    }));
  });

  const find = (value: unknown) => {
    outputs['context_engine_memory_dream_memory.relationship'] = value;
  };

  it('returns the outdated links it was shown, and nothing else, when no link is proposed', async () => {
    find({
      links: [],
      outdate: [
        { target_id: 'link-1', source_ids: ['s1'] },
        { target_id: 'not-shown', source_ids: ['s1'] },
      ],
    });

    const result = await propose({ links: [link('link-1', 'team-1', 'owns', 'service-1')] });

    expect(result).toEqual({
      operations: [{ op: 'outdate', target_id: 'link-1', source_ids: ['s1'] }],
      dropped: 0,
    });
    expect(msearch).not.toHaveBeenCalled();
    expect(calledSteps()).toEqual(['context_engine_memory_dream_memory.relationship']);
  });

  it('creates a link between shown memories without searching for them', async () => {
    find({
      links: [
        {
          from_id: 'team-1',
          relation: 'Owns',
          to_id: 'service-1',
          description: 'The team runs it.',
          source_ids: ['s1'],
        },
      ],
    });

    const result = await propose({ candidates: [team, service] });

    expect(result).toEqual({
      operations: [
        {
          op: 'create',
          from_id: 'team-1',
          relation: 'owns',
          to_id: 'service-1',
          description: 'The team runs it.',
          source_ids: ['s1'],
        },
      ],
      dropped: 0,
    });
    expect(msearch).not.toHaveBeenCalled();
    expect(findLinksMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['team-1', 'service-1'] })
    );
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ retry: { onValidationError: 1 } })
    );
  });

  it('matches names exactly, by alias, or by a clear lead, and drops links to unknown names', async () => {
    find({
      links: [
        {
          from_title: 'inference platform',
          from_type: 'entity',
          from_kind: 'team',
          relation: 'owns',
          to_title: 'Perf Canary',
          to_type: 'memory.entity',
          source_ids: ['s1'],
        },
        {
          from_title: 'Runtime team',
          from_type: 'entity',
          relation: 'maintains',
          to_title: 'perf-canary',
          to_type: 'entity',
          source_ids: ['s1'],
        },
        {
          from_title: 'Billing',
          from_type: 'entity',
          relation: 'uses',
          to_title: 'perf-canary',
          to_type: 'entity',
          source_ids: ['s1'],
        },
      ],
    });
    msearch.mockResolvedValueOnce(
      searchResults(
        [[team, 2]],
        [[service, 3]],
        [
          [otherTeam, 9],
          [team, 2],
        ],
        [[service, 9]],
        []
      )
    );

    const result = await propose({});

    expect(
      result.operations.map(({ from_id, relation, to_id }) => [from_id, relation, to_id])
    ).toEqual([
      ['team-1', 'owns', 'service-1'],
      ['team-2', 'maintains', 'service-1'],
    ]);
    expect(result.dropped).toBe(1);
    expect(calledSteps()).toEqual(['context_engine_memory_dream_memory.relationship']);
  });

  it('asks the model to pick between close matches, and drops the link when it picks none', async () => {
    find({
      links: [
        {
          from_title: 'Platform',
          from_type: 'entity',
          relation: 'owns',
          to_id: 'service-1',
          source_ids: ['s1'],
        },
        {
          from_title: 'Infra',
          from_type: 'entity',
          relation: 'owns',
          to_id: 'service-1',
          source_ids: ['s1'],
        },
      ],
    });
    msearch.mockResolvedValueOnce(
      searchResults(
        [
          [team, 5],
          [otherTeam, 4],
        ],
        [[otherTeam, 1]]
      )
    );
    outputs['context_engine_memory_dream_memory.relationship_match'] = {
      matches: [{ ref: 'n1', id: 'team-1' }, { ref: 'n2' }],
    };

    const result = await propose({ candidates: [service] });

    expect(result.operations).toEqual([
      expect.objectContaining({ op: 'create', from_id: 'team-1', to_id: 'service-1' }),
    ]);
    expect(result.dropped).toBe(1);
    const { input } = output.mock.calls[1][0];
    expect(input).toContain('## n1\nname: Platform');
    expect(input).toContain('  - id: team-2');
  });

  it('reinforces a link it already has without checking it', async () => {
    find({
      links: [{ from_id: 'team-1', relation: 'owns', to_id: 'service-1', source_ids: ['s1'] }],
    });

    const result = await propose({
      candidates: [team, service],
      links: [link('link-1', 'team-1', 'owns', 'service-1')],
    });

    expect(result.operations).toEqual([
      { op: 'reinforce', target_id: 'link-1', source_ids: ['s1'] },
    ]);
    expect(calledSteps()).toEqual(['context_engine_memory_dream_memory.relationship']);
  });

  it('checks a link against the links it may replace, and follows the decision', async () => {
    find({
      links: [
        {
          from_id: 'team-2',
          relation: 'owns',
          to_id: 'service-1',
          description: 'Ownership moved.',
          source_ids: ['s1'],
        },
        { from_id: 'team-1', relation: 'uses', to_id: 'service-1', source_ids: ['s1'] },
      ],
    });
    findLinksMock.mockResolvedValue([
      {
        id: 'link-1',
        document: link('link-1', 'team-1', 'owns', 'service-1'),
        seqNo: 1,
        primaryTerm: 1,
      },
      {
        id: 'link-2',
        document: link('link-2', 'team-2', 'member_of', 'team-1'),
        seqNo: 1,
        primaryTerm: 1,
      },
    ]);
    outputs['context_engine_memory_dream_memory.relationship_check'] = {
      decisions: [
        { ref: 'p1', op: 'supersede', target_id: 'link-1', reason: 'Newer session.' },
        { ref: 'p2', op: 'skip', reason: 'Not supported.' },
      ],
    };

    const result = await propose({ candidates: [team, otherTeam, service] });

    expect(result).toEqual({
      operations: [
        {
          op: 'supersede',
          target_id: 'link-1',
          from_id: 'team-2',
          relation: 'owns',
          to_id: 'service-1',
          description: 'Ownership moved.',
          source_ids: ['s1'],
          reason: 'Newer session.',
        },
      ],
      dropped: 1,
    });
    const { input } = output.mock.calls[1][0];
    expect(input).toContain('## p1\nproposed: Runtime owns perf-canary');
    expect(input).toContain('  - id: link-1');
    expect(input).not.toContain('  - id: link-2');
  });
});
