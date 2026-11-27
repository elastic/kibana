/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RELATIONSHIP_KI_TYPE } from '../../../../common/dreaming';
import { CREATED_BY_RELATION } from './types';
import { buildKiGraph, relationLabelForReferences } from './build_ki_graph';
import type { EsqlCellRecord } from './esql_rows';

const row = (partial: EsqlCellRecord): EsqlCellRecord => partial;

describe('relationLabelForReferences', () => {
  it('uses the shared relation when all values agree', () => {
    expect(relationLabelForReferences(['derived_from', 'derived_from'])).toBe('derived_from');
  });

  it('falls back when relation values disagree', () => {
    expect(relationLabelForReferences(['derived_from', 'relates_to'])).toBe('references');
  });
});

describe('buildKiGraph', () => {
  const limit = 1000;

  it('keeps the latest revision per id when rows are sorted newest first', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'New title',
        updated_at: '2025-02-02T00:00:00.000Z',
      }),
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Old title',
        updated_at: '2025-01-01T00:00:00.000Z',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({ kiId: 'fact-1', title: 'New title', kind: 'fact' });
  });

  it('drops a node when the latest revision is deleted', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Removed',
        'governance.lifecycle.status': 'deleted',
        updated_at: '2025-02-02T00:00:00.000Z',
      }),
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Still here in history',
        updated_at: '2025-01-01T00:00:00.000Z',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toHaveLength(0);
  });

  it('adds ki:// reference edges and labels them from references.relation', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Fact',
        'references.uri': ['ki://mem-1'],
        'references.relation': ['derived_from'],
      }),
      row({
        id: 'mem-1',
        _index: 'idx-a',
        type: 'memory.session',
        title: 'Memory',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.edges).toContainEqual({
      id: 'fact-1->mem-1:ref',
      source: 'fact-1',
      target: 'mem-1',
      relation: 'derived_from',
    });
  });

  it('labels mixed reference relations as references', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Fact',
        'references.uri': ['ki://mem-1', 'ki://mem-2'],
        'references.relation': ['derived_from', 'relates_to'],
      }),
      row({ id: 'mem-1', _index: 'idx-a', type: 'memory.session', title: 'M1' }),
      row({ id: 'mem-2', _index: 'idx-a', type: 'memory.session', title: 'M2' }),
    ];

    const graph = buildKiGraph(records, limit);
    const refEdges = graph.edges.filter((edge) => edge.id.endsWith(':ref'));
    expect(refEdges).toHaveLength(2);
    expect(refEdges.every((edge) => edge.relation === 'references')).toBe(true);
  });

  it('creates workflow nodes and created_by edges', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Fact',
        'governance.provenance.created_by.uri': 'workflow://system-my-wf-abcdef12',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kiId: 'workflow:system-my-wf-abcdef12',
          kind: 'workflow',
          subtype: '',
          title: 'my-wf',
          index: 'idx-a',
        }),
        expect.objectContaining({ kiId: 'fact-1', kind: 'fact' }),
      ])
    );
    expect(graph.edges).toContainEqual({
      id: 'fact-1->workflow:system-my-wf-abcdef12:created_by',
      source: 'fact-1',
      target: 'workflow:system-my-wf-abcdef12',
      relation: CREATED_BY_RELATION,
    });
  });

  it('creates crawler nodes and created_by edges', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'workflow:system-context-engine-trace-dreaming-wwwww-37a8eec1ce19687d',
        _index: 'idx-a',
        type: 'workflow',
        title: 'Trace dreaming: wwwww',
        'governance.provenance.created_by.uri': 'crawler://sml',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kiId: 'workflow:system-context-engine-trace-dreaming-wwwww-37a8eec1ce19687d',
          kind: 'workflow',
          subtype: '',
          title: 'Trace dreaming: wwwww',
        }),
        expect.objectContaining({
          kiId: 'crawler:sml',
          kind: 'crawler',
          subtype: '',
          title: 'sml',
          index: 'idx-a',
        }),
      ])
    );
    expect(graph.edges).toContainEqual({
      id: 'workflow:system-context-engine-trace-dreaming-wwwww-37a8eec1ce19687d->crawler:sml:created_by',
      source: 'workflow:system-context-engine-trace-dreaming-wwwww-37a8eec1ce19687d',
      target: 'crawler:sml',
      relation: CREATED_BY_RELATION,
    });
  });

  it('keeps the real workflow KI when a synthetic workflow node shares its kiId', () => {
    const workflowKiId = 'workflow:system-my-wf-abcdef12';
    const records: EsqlCellRecord[] = [
      row({
        id: workflowKiId,
        _index: 'idx-real',
        type: 'workflow',
        title: 'Real workflow title',
        'governance.provenance.created_by.uri': 'workflow://system-my-wf-abcdef12',
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({
      kiId: workflowKiId,
      title: 'Real workflow title',
      index: 'idx-real',
      kind: 'workflow',
    });
  });

  it('classifies memory and document kinds', () => {
    const records: EsqlCellRecord[] = [
      row({ id: 'mem-1', _index: 'idx-a', type: 'memory.session', title: 'Session' }),
      row({ id: 'doc-1', _index: 'idx-a', type: 'custom.note', title: 'Note' }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kiId: 'mem-1', kind: 'memory', subtype: 'session' }),
        expect.objectContaining({ kiId: 'doc-1', kind: 'document', subtype: 'custom.note' }),
      ])
    );
  });

  it('builds memory.relationship rows as edges', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'from-1',
        _index: 'idx-a',
        type: 'entity.team',
        title: 'Team',
      }),
      row({
        id: 'to-1',
        _index: 'idx-a',
        type: 'entity.person',
        title: 'Person',
      }),
      row({
        id: 'rel-1',
        _index: 'idx-a',
        type: RELATIONSHIP_KI_TYPE,
        attributes: { 'memory.key': 'from-1|member_of|to-1' },
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.edges).toContainEqual({
      id: 'rel-1',
      source: 'from-1',
      target: 'to-1',
      relation: 'member_of',
    });
  });

  it('drops dangling reference edges', () => {
    const records: EsqlCellRecord[] = [
      row({
        id: 'fact-1',
        _index: 'idx-a',
        type: 'fact.status',
        title: 'Fact',
        'references.uri': ['ki://missing'],
        'references.relation': ['derived_from'],
      }),
    ];

    const graph = buildKiGraph(records, limit);
    expect(graph.edges).toHaveLength(0);
  });

  it('sets truncated when the row count reaches the limit', () => {
    const records: EsqlCellRecord[] = [
      row({ id: 'fact-1', _index: 'idx-a', type: 'fact.status', title: 'One' }),
    ];

    expect(buildKiGraph(records, 1).truncated).toBe(true);
    expect(buildKiGraph(records, 2).truncated).toBe(false);
  });
});
