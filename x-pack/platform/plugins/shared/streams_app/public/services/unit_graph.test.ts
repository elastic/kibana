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

/** Each line with what its "Add processing" does. */
const lineTargets = ({ edges }: UnitGraph) =>
  Object.fromEntries(
    edges.map(({ source, target, processingTarget }) => [
      `${endpointKey(source)} -> ${endpointKey(target)}`,
      describeTarget(processingTarget),
    ])
  );

const pipelineSlot = (pipelineId: string): ProcessingNodeRef => ({
  kind: 'pipeline',
  pipelineId,
});

describe('buildUnitGraph', () => {
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
    expect(graph.edges).toEqual([
      {
        source: { kind: 'source', id: 'src' },
        target: { kind: 'destination', id: 'es' },
        forwarding: 'direct',
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

  it('adds to the shared slot instead of moving a line off telemetry-scoped wiring', () => {
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
    expect(graph.edges.map(({ processingTarget }) => processingTarget)).toEqual([
      { ref: pipelineSlot('p-src'), position: 'end', exists: false },
      { ref: pipelineSlot('p-src'), position: 'end', exists: false },
    ]);
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
  });

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
    expect(lineTargets(graph)).toEqual({
      'source:in -> processing:processing-route-main-0': 'add to processing-route-main-0 at start',
      'processing:processing-route-main-0 -> processing:processing-pipeline-nginx-processing':
        'add to processing-pipeline-nginx-processing at start',
      'processing:processing-pipeline-nginx-processing -> destination:es-nginx':
        'add to processing-pipeline-nginx-processing at end',
      'source:in -> destination:fallback-out': 'create processing-route-main-1',
    });
  });

  it('prefers the route slot over a pipeline slot on a routed line', () => {
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
    expect(lineTargets(graph)).toEqual({
      'source:in -> destination:a': 'create processing-route-main-0',
      'source:in -> destination:b': 'create processing-route-main-1',
    });
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
      'processing-pipeline-shared',
      'processing-route-main-1',
    ]);
    expect(
      graph.edges.filter(
        ({ target }) => endpointKey(target) === 'processing:processing-pipeline-shared'
      )
    ).toHaveLength(2);
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
