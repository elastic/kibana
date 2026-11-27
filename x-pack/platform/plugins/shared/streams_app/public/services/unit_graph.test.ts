/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import {
  buildUnitGraph,
  endpointKey,
  getSlotProcessorIds,
  processingNodeId,
  type ProcessingNodeRef,
  type UnitEdgeProcessingTarget,
  type UnitGraph,
  type UnitGraphEdge,
} from './unit_graph';

const unitWith = (pipelines: Unit['unit']['pipelines']): Unit => ({
  unit: { sources: [], destinations: [], pipelines },
  ui_metadata: {},
});

const describeTarget = (target: UnitEdgeProcessingTarget | undefined) => {
  if (!target) {
    return 'unavailable';
  }
  if ('line' in target) {
    return 'move onto its own pipeline';
  }
  return `${target.exists ? 'add to' : 'create'} ${processingNodeId(target.ref)}${
    target.exists ? ` at ${target.position}` : ''
  }`;
};

const lineKey = ({ source, target }: UnitGraphEdge) =>
  `${endpointKey(source)} -> ${endpointKey(target)}`;

/** Each line with what its "Add processing" does. */
const lineTargets = ({ edges }: UnitGraph) =>
  Object.fromEntries(edges.map((edge) => [lineKey(edge), describeTarget(edge.processingTarget)]));

/** Each line with the reference it edits, or `fixed`. */
const lineReferences = ({ edges }: UnitGraph) =>
  Object.fromEntries(
    edges.map((edge) => [
      lineKey(edge),
      edge.editable
        ? edge.reference?.kind === 'routeDestinations' || edge.reference?.kind === 'routePipelines'
          ? `${edge.reference.kind} ${edge.reference.rule.pipelineId}#${edge.reference.rule.ruleIndex}`
          : `${edge.reference?.kind} ${edge.reference?.pipelineId}`
        : 'fixed',
    ])
  );

const pipelineSlot = (pipelineId: string): ProcessingNodeRef => ({
  kind: 'pipeline',
  pipelineId,
});

describe('buildUnitGraph', () => {
  describe('direct lines', () => {
    it("offers the source pipeline's slot on a direct line", () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'p-src',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['src'] },
              { name: 'destinations', value: ['es'] },
            ],
          },
        ]),
        new Set(['src']),
        new Set(['es'])
      );
      expect(graph.processingNodes).toEqual([]);
      expect(graph.routingNodes).toEqual([]);
      expect(graph.edges).toEqual([
        {
          source: { kind: 'source', id: 'src' },
          target: { kind: 'destination', id: 'es' },
          forwarding: 'direct',
          editable: true,
          reference: { kind: 'destinations', pipelineId: 'p-src' },
          processingTarget: { ref: pipelineSlot('p-src'), position: 'end', exists: false },
        },
      ]);
    });

    it('moves a fan-out line onto its own pipeline so the other line is not processed', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'p-src',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['src'] },
              { name: 'destinations', value: ['a', 'b'] },
            ],
          },
        ]),
        new Set(['src']),
        new Set(['a', 'b'])
      );
      expect(graph.edges.map(({ processingTarget }) => processingTarget)).toEqual([
        { line: { sourceId: 'src', destinationId: 'a' } },
        { line: { sourceId: 'src', destinationId: 'b' } },
      ]);
    });

    it('moves one line of a pipeline several sources feed onto its own pipeline', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['a', 'b'] },
              { name: 'destinations', value: ['out'] },
            ],
          },
        ]),
        new Set(['a', 'b']),
        new Set(['out'])
      );
      expect(lineTargets(graph)).toEqual({
        'source:a -> destination:out': 'move onto its own pipeline',
        'source:b -> destination:out': 'move onto its own pipeline',
      });
    });

    it('draws telemetry-scoped destinations entries as read-only lines that share the slot', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'p-src',
            supported_telemetry: ['logs', 'traces'],
            config: [
              { name: 'sources', value: ['src'] },
              { name: 'destinations', value: ['a'], telemetry: ['logs'] },
              { name: 'destinations', value: ['b'], telemetry: ['traces'] },
            ],
          },
        ]),
        new Set(['src']),
        new Set(['a', 'b'])
      );
      expect(
        graph.edges.map(({ editable, processingTarget }) => ({ editable, processingTarget }))
      ).toEqual([
        {
          editable: false,
          processingTarget: { ref: pipelineSlot('p-src'), position: 'end', exists: false },
        },
        {
          editable: false,
          processingTarget: { ref: pipelineSlot('p-src'), position: 'end', exists: false },
        },
      ]);
    });

    it('skips sources and destinations that are not on the canvas', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['hidden'] },
              { name: 'destinations', value: ['es'] },
            ],
          },
        ]),
        new Set(),
        new Set(['es'])
      );
      expect(graph.edges).toEqual([]);
    });
  });

  describe('processing nodes', () => {
    it('adds to an existing pipeline node from the lines around it', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'p-src',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['src'] },
              { name: 'processors', value: ['add-fields-1'] },
              { name: 'destinations', value: ['es'] },
            ],
          },
        ]),
        new Set(['src']),
        new Set(['es'])
      );
      expect(graph.processingNodes).toEqual([
        {
          ref: pipelineSlot('p-src'),
          processorIds: ['add-fields-1'],
          telemetry: ['logs'],
          name: undefined,
          editable: true,
        },
      ]);
      expect(lineTargets(graph)).toEqual({
        'source:src -> processing:processing-pipeline-p-src':
          'add to processing-pipeline-p-src at start',
        'processing:processing-pipeline-p-src -> destination:es':
          'add to processing-pipeline-p-src at end',
      });
      expect(lineReferences(graph)).toEqual({
        'source:src -> processing:processing-pipeline-p-src': 'sources p-src',
        'processing:processing-pipeline-p-src -> destination:es': 'destinations p-src',
      });
    });

    it('adds to the shared node from the lines leaving it', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'p-src',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['src'] },
              { name: 'processors', value: ['add-fields-1'] },
              { name: 'destinations', value: ['a', 'b'] },
            ],
          },
        ]),
        new Set(['src']),
        new Set(['a', 'b'])
      );
      expect(lineTargets(graph)).toEqual({
        'source:src -> processing:processing-pipeline-p-src':
          'add to processing-pipeline-p-src at start',
        'processing:processing-pipeline-p-src -> destination:a':
          'add to processing-pipeline-p-src at end',
        'processing:processing-pipeline-p-src -> destination:b':
          'add to processing-pipeline-p-src at end',
      });
    });

    it('keeps per-telemetry processors entries as one read-only node', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs', 'traces'],
            config: [
              { name: 'sources', value: ['in'] },
              { name: 'processors', value: ['a'], telemetry: ['logs'] },
              { name: 'processors', value: ['b'], telemetry: ['traces'] },
              { name: 'destinations', value: ['out'] },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['out'])
      );
      expect(graph.processingNodes).toHaveLength(1);
      expect(graph.processingNodes[0]).toMatchObject({ processorIds: ['a', 'b'], editable: false });
      expect(Object.values(lineTargets(graph))).toEqual(['unavailable', 'unavailable']);
      // The lines themselves only edit `sources` and `destinations`, which are not scoped.
      expect(graph.edges.map(({ editable }) => editable)).toEqual([true, true]);
    });

    it('draws a processing node nothing feeds, unconnected, with its lines out', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'orphan',
            supported_telemetry: ['logs'],
            config: [
              { name: 'processors', value: ['enrich'] },
              { name: 'destinations', value: ['es'] },
            ],
          },
        ]),
        new Set(),
        new Set(['es'])
      );
      expect(graph.processingNodes.map(({ ref }) => processingNodeId(ref))).toEqual([
        'processing-pipeline-orphan',
      ]);
      expect(Object.keys(lineTargets(graph))).toEqual([
        'processing:processing-pipeline-orphan -> destination:es',
      ]);
    });
  });

  describe('routing nodes', () => {
    it("follows the route and child pipeline slots of a routed unit (Kerry's nginx example)", () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['in'] },
              {
                name: 'routes',
                value: [
                  {
                    when: 'body["event.module"] == "nginx"',
                    processors: ['tag-routed'],
                    pipelines: ['nginx-processing'],
                  },
                  { destinations: ['fallback-out'] },
                ],
              },
            ],
          },
          {
            id: 'nginx-processing',
            supported_telemetry: ['logs'],
            config: [
              { name: 'processors', value: ['enrich-nginx'] },
              { name: 'destinations', value: ['es-nginx'] },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['es-nginx', 'fallback-out'])
      );
      expect(graph.processingNodes.map(({ ref }) => processingNodeId(ref))).toEqual([
        'processing-route-main-0',
        'processing-pipeline-nginx-processing',
      ]);
      expect(graph.routingNodes).toEqual([
        {
          pipelineId: 'main',
          name: undefined,
          sourceIds: ['in'],
          synthetic: false,
          rules: [
            {
              index: 0,
              when: 'body["event.module"] == "nginx"',
              targets: [{ kind: 'pipeline', id: 'nginx-processing' }],
            },
            {
              index: 1,
              targets: [{ kind: 'destination', id: 'fallback-out' }],
            },
          ],
        },
      ]);
      expect(lineTargets(graph)).toEqual({
        'source:in -> routing:main': 'create processing-pipeline-main',
        'rule:main:0 -> processing:processing-route-main-0':
          'add to processing-route-main-0 at start',
        'processing:processing-route-main-0 -> processing:processing-pipeline-nginx-processing':
          'add to processing-route-main-0 at end',
        'processing:processing-pipeline-nginx-processing -> destination:es-nginx':
          'add to processing-pipeline-nginx-processing at end',
        'rule:main:1 -> destination:fallback-out': 'create processing-route-main-1',
      });
      expect(lineReferences(graph)).toEqual({
        'source:in -> routing:main': 'sources main',
        'rule:main:0 -> processing:processing-route-main-0': 'fixed',
        'processing:processing-route-main-0 -> processing:processing-pipeline-nginx-processing':
          'routePipelines main#0',
        'processing:processing-pipeline-nginx-processing -> destination:es-nginx':
          'destinations nginx-processing',
        'rule:main:1 -> destination:fallback-out': 'routeDestinations main#1',
      });
    });

    it('feeds the routing node from the pipeline processing with a fixed line', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['in'] },
              { name: 'processors', value: ['parse'] },
              { name: 'routes', value: [{ destinations: ['out'] }] },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['out'])
      );
      expect(lineReferences(graph)).toEqual({
        'source:in -> processing:processing-pipeline-main': 'sources main',
        'processing:processing-pipeline-main -> routing:main': 'fixed',
        'rule:main:0 -> destination:out': 'routeDestinations main#0',
      });
      expect(lineTargets(graph)['processing:processing-pipeline-main -> routing:main']).toBe(
        'add to processing-pipeline-main at end'
      );
    });

    it('draws a bare delegated child as a synthetic one-rule routing node', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['in'] },
              {
                name: 'routes',
                value: [{ when: 'true', pipelines: ['plumbing'] }, { destinations: ['b'] }],
              },
            ],
          },
          {
            id: 'plumbing',
            supported_telemetry: ['logs'],
            config: [{ name: 'destinations', value: ['a'] }],
          },
        ]),
        new Set(['in']),
        new Set(['a', 'b'])
      );
      expect(
        graph.routingNodes.map(({ pipelineId, synthetic, rules }) => ({
          pipelineId,
          synthetic,
          rules,
        }))
      ).toEqual([
        {
          pipelineId: 'main',
          synthetic: false,
          rules: [
            expect.objectContaining({ index: 0, targets: [{ kind: 'pipeline', id: 'plumbing' }] }),
            expect.objectContaining({ index: 1, targets: [{ kind: 'destination', id: 'b' }] }),
          ],
        },
        {
          pipelineId: 'plumbing',
          synthetic: true,
          rules: [{ index: 0, targets: [{ kind: 'destination', id: 'a' }] }],
        },
      ]);
      expect(lineTargets(graph)).toEqual({
        'source:in -> routing:main': 'create processing-pipeline-main',
        'rule:main:0 -> routing:plumbing': 'create processing-route-main-0',
        'rule:main:1 -> destination:b': 'create processing-route-main-1',
        'rule:plumbing:0 -> destination:a': 'create processing-pipeline-plumbing',
      });
      expect(lineReferences(graph)['rule:plumbing:0 -> destination:a']).toBe(
        'destinations plumbing'
      );
    });

    it('enters a child with routes through its routing node', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['in'] },
              { name: 'routes', value: [{ pipelines: ['child'] }] },
            ],
          },
          {
            id: 'child',
            supported_telemetry: ['logs'],
            config: [
              {
                name: 'routes',
                value: [{ when: 'x', destinations: ['a'] }, { destinations: ['b'] }],
              },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['a', 'b'])
      );
      expect(Object.keys(lineReferences(graph))).toEqual([
        'source:in -> routing:main',
        'rule:main:0 -> routing:child',
        'rule:child:0 -> destination:a',
        'rule:child:1 -> destination:b',
      ]);
      expect(
        graph.routingNodes.map(({ pipelineId, synthetic }) => ({ pipelineId, synthetic }))
      ).toEqual([
        { pipelineId: 'main', synthetic: false },
        { pipelineId: 'child', synthetic: false },
      ]);
    });

    it('draws one node for a child pipeline two routes delegate to', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['in'] },
              {
                name: 'routes',
                value: [
                  { when: 'true', processors: ['tag-a'], pipelines: ['shared'] },
                  { processors: ['tag-b'], pipelines: ['shared'] },
                ],
              },
            ],
          },
          {
            id: 'shared',
            supported_telemetry: ['logs'],
            config: [
              { name: 'processors', value: ['enrich'] },
              { name: 'destinations', value: ['out'] },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['out'])
      );
      expect(graph.processingNodes.map(({ ref }) => processingNodeId(ref))).toEqual([
        'processing-route-main-0',
        'processing-route-main-1',
        'processing-pipeline-shared',
      ]);
      expect(
        graph.edges.filter(
          ({ target }) => endpointKey(target) === 'processing:processing-pipeline-shared'
        )
      ).toHaveLength(2);
    });

    it('draws two sources feeding one routing node and leaves its slot to a lone line only', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['a', 'b'] },
              { name: 'routes', value: [{ destinations: ['out'] }] },
            ],
          },
        ]),
        new Set(['a', 'b']),
        new Set(['out'])
      );
      expect(lineTargets(graph)).toEqual({
        'source:a -> routing:main': 'unavailable',
        'source:b -> routing:main': 'unavailable',
        'rule:main:0 -> destination:out': 'create processing-route-main-0',
      });
      expect(graph.routingNodes[0].sourceIds).toEqual(['a', 'b']);
    });

    it('flattens telemetry-scoped routes entries into one read-only routing node', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'main',
            supported_telemetry: ['logs', 'metrics'],
            config: [
              { name: 'sources', value: ['in'] },
              { name: 'routes', value: [{ destinations: ['logs-out'] }], telemetry: ['logs'] },
              {
                name: 'routes',
                value: [
                  { when: 'x', telemetry: ['metrics', 'traces'], destinations: ['metrics-out'] },
                ],
                telemetry: ['metrics'],
              },
            ],
          },
        ]),
        new Set(['in']),
        new Set(['logs-out', 'metrics-out'])
      );
      expect(graph.routingNodes).toHaveLength(1);
      expect(graph.routingNodes[0].rules).toEqual([
        expect.objectContaining({
          index: 0,
          telemetry: ['logs'],
          targets: [{ kind: 'destination', id: 'logs-out' }],
        }),
        expect.objectContaining({
          index: 1,
          when: 'x',
          telemetry: ['metrics'],
          targets: [{ kind: 'destination', id: 'metrics-out' }],
        }),
      ]);
      expect(Object.values(lineReferences(graph))).toEqual(['fixed', 'fixed', 'fixed']);
    });

    it('draws a routing node with an unconnected rule and one nothing feeds', () => {
      const graph = buildUnitGraph(
        unitWith([
          {
            id: 'lonely',
            supported_telemetry: ['logs'],
            config: [{ name: 'routes', value: [{ when: 'x', destinations: [] }] }],
          },
        ]),
        new Set(),
        new Set()
      );
      expect(graph.routingNodes).toEqual([
        {
          pipelineId: 'lonely',
          name: undefined,
          sourceIds: [],
          synthetic: false,
          rules: [{ index: 0, when: 'x', action: undefined, targets: [] }],
        },
      ]);
      expect(graph.edges).toEqual([]);
    });
  });
});

describe('getSlotProcessorIds', () => {
  const routedUnit = unitWith([
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['in'] },
        { name: 'processors', value: ['parse', 'enrich'] },
        {
          name: 'routes',
          value: [
            { when: 'a', processors: ['tag-a'], pipelines: ['child'] },
            { when: 'b', processors: ['tag-b1', 'tag-b2'], destinations: ['out-b'] },
            { destinations: ['fallback-out'] },
          ],
        },
      ],
    },
    {
      id: 'child',
      supported_telemetry: ['logs'],
      config: [
        { name: 'processors', value: ['child-step'] },
        { name: 'destinations', value: ['es-child'] },
      ],
    },
  ]);

  it('returns the processors of a pipeline slot, in order', () => {
    expect(getSlotProcessorIds(routedUnit, pipelineSlot('main'))).toEqual(['parse', 'enrich']);
    expect(getSlotProcessorIds(routedUnit, pipelineSlot('child'))).toEqual(['child-step']);
  });

  it('returns the processors of a route slot, in order', () => {
    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'main', routeIndex: 0 })
    ).toEqual(['tag-a']);
    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'main', routeIndex: 1 })
    ).toEqual(['tag-b1', 'tag-b2']);
  });

  it('returns none for a route without processors', () => {
    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'main', routeIndex: 2 })
    ).toEqual([]);
  });

  it('returns none for a slot that does not exist', () => {
    expect(getSlotProcessorIds(routedUnit, pipelineSlot('missing'))).toEqual([]);
    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'main', routeIndex: 9 })
    ).toEqual([]);
    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'missing', routeIndex: 0 })
    ).toEqual([]);
  });

  it('returns a copy, so a caller cannot change the unit', () => {
    const ids = getSlotProcessorIds(routedUnit, {
      kind: 'route',
      pipelineId: 'main',
      routeIndex: 0,
    });
    ids.push('changed');

    expect(
      getSlotProcessorIds(routedUnit, { kind: 'route', pipelineId: 'main', routeIndex: 0 })
    ).toEqual(['tag-a']);
  });

  it('joins the per-telemetry entries of a pipeline slot, as the graph does', () => {
    const unit = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['in'] },
          { name: 'processors', value: ['a'], telemetry: ['logs'] },
          { name: 'processors', value: ['b'], telemetry: ['traces'] },
          { name: 'destinations', value: ['out'] },
        ],
      },
    ]);

    expect(getSlotProcessorIds(unit, pipelineSlot('main'))).toEqual(['a', 'b']);
  });

  it('agrees with the processor ids that the graph records for every slot', () => {
    const graph = buildUnitGraph(routedUnit, new Set(['in']), new Set(['out-b', 'es-child']));

    expect(graph.processingNodes.length).toBeGreaterThan(0);
    graph.processingNodes.forEach(({ ref, processorIds }) => {
      expect(getSlotProcessorIds(routedUnit, ref)).toEqual(processorIds);
    });
  });
});
