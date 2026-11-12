/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../../services/unit_repository';
import {
  buildUnitCanvasGraph,
  readLineOrigin,
  readLineTarget,
  readRoutingRuleIndex,
  withRoutingDiagnostics,
} from './build_unit_connection_edges';
import { DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE, type ClassicCanvasNode } from './types';

const routedUnit: Unit = {
  unit: {
    sources: [],
    destinations: [],
    pipelines: [
      {
        id: 'p-direct',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['direct-source'] },
          { name: 'destinations', value: ['es-a'] },
        ],
      },
      {
        id: 'p-routed',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['routed-source'] },
          {
            name: 'routes',
            value: [
              { when: 'attributes["env"] == "prod"', destinations: ['es-a', 'missing'] },
              { when: 'true', pipelines: ['child', 'unknown-pipeline'] },
              { destinations: ['es-b'] },
            ],
          },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'destinations', value: ['es-c'] }],
      },
    ],
  },
  ui_metadata: {},
};

const sourceIds = ['direct-source', 'routed-source'];
const destinationIds = ['es-a', 'es-b', 'es-c'];

const buildRouted = (shownSourceIds = sourceIds) =>
  buildUnitCanvasGraph(routedUnit, shownSourceIds, destinationIds);

describe('buildUnitCanvasGraph with routing nodes', () => {
  it('draws direct lines, lines into routing nodes and lines out of their rules', () => {
    expect(
      buildRouted().edges.map(({ id, source, sourceHandle, target }) => [
        id,
        source,
        sourceHandle,
        target,
      ])
    ).toEqual([
      [
        'unit-connection-direct-source->es-a',
        'configured-source-direct-source',
        undefined,
        'configured-destination-es-a',
      ],
      [
        'unit-connection-configured-source-routed-source->configured-routing-p-routed',
        'configured-source-routed-source',
        undefined,
        'configured-routing-p-routed',
      ],
      [
        'unit-connection-configured-routing-p-routed:rule-0->configured-destination-es-a',
        'configured-routing-p-routed',
        'rule-0',
        'configured-destination-es-a',
      ],
      [
        'unit-connection-configured-routing-p-routed:rule-1->configured-routing-child',
        'configured-routing-p-routed',
        'rule-1',
        'configured-routing-child',
      ],
      [
        'unit-connection-configured-routing-p-routed:rule-2->configured-destination-es-b',
        'configured-routing-p-routed',
        'rule-2',
        'configured-destination-es-b',
      ],
      [
        'unit-connection-configured-routing-child:rule-0->configured-destination-es-c',
        'configured-routing-child',
        'rule-0',
        'configured-destination-es-c',
      ],
    ]);
  });

  it('builds a routing node per routed pipeline, including a bare delegated child', () => {
    expect(
      buildRouted().routingNodes.map(({ id, data }) => [
        id,
        data.pipelineId,
        data.rules.map(({ handleId, label, isCatchAll, connected }) => ({
          handleId,
          label,
          isCatchAll,
          connected,
        })),
      ])
    ).toEqual([
      [
        'configured-routing-p-routed',
        'p-routed',
        [
          {
            handleId: 'rule-0',
            label: 'Condition: attributes["env"] == "prod"',
            isCatchAll: false,
            connected: true,
          },
          { handleId: 'rule-1', label: 'Condition: true', isCatchAll: false, connected: true },
          { handleId: 'rule-2', label: 'Otherwise', isCatchAll: true, connected: true },
        ],
      ],
      [
        'configured-routing-child',
        'child',
        [{ handleId: 'rule-0', label: 'All data', isCatchAll: true, connected: true }],
      ],
    ]);
  });

  it('lets every reference line be moved and unhooked', () => {
    const { edges } = buildRouted();

    expect(new Set(edges.map(({ id }) => id)).size).toBe(edges.length);
    expect(
      edges.map(({ target, reconnectable, className, data }) => [
        target,
        reconnectable,
        className,
        data?.reference?.kind,
      ])
    ).toEqual([
      ['configured-destination-es-a', 'target', 'streamsUnitConnection nopan', 'destinations'],
      ['configured-routing-p-routed', 'target', 'streamsUnitConnection nopan', 'sources'],
      ['configured-destination-es-a', 'target', 'streamsUnitConnection nopan', 'routeDestinations'],
      ['configured-routing-child', 'target', 'streamsUnitConnection nopan', 'routePipelines'],
      ['configured-destination-es-b', 'target', 'streamsUnitConnection nopan', 'routeDestinations'],
      ['configured-destination-es-c', 'target', 'streamsUnitConnection nopan', 'destinations'],
    ]);
    edges.forEach((edge) => {
      expect(edge).toMatchObject({ deletable: false, selectable: false, type: 'animated' });
    });
  });

  it('lets "Add routing" put a routing node on lines leaving processing', () => {
    const processed = {
      unit: {
        sources: [],
        destinations: [],
        processors: [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }],
        pipelines: [
          {
            id: 'fan',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['s1'] },
              { name: 'processors', value: ['tag'] },
              { name: 'destinations', value: ['es-a', 'es-b'] },
            ],
          },
          {
            id: 'ruled',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['s2'] },
              { name: 'routes', value: [{ processors: ['tag'], destinations: ['es-c'] }] },
            ],
          },
        ],
      },
      ui_metadata: {},
    } as Unit;
    const { edges } = buildUnitCanvasGraph(processed, ['s1', 's2'], ['es-a', 'es-b', 'es-c']);
    expect(
      edges
        .filter(({ source }) => source.startsWith('processing-'))
        .map(({ source, target, data }) => [source, target, data?.routingLine])
    ).toEqual([
      [
        'processing-pipeline-fan',
        'configured-destination-es-a',
        {
          origin: { kind: 'processing', ref: { kind: 'pipeline', pipelineId: 'fan' } },
          destinationId: 'es-a',
        },
      ],
      [
        'processing-pipeline-fan',
        'configured-destination-es-b',
        {
          origin: { kind: 'processing', ref: { kind: 'pipeline', pipelineId: 'fan' } },
          destinationId: 'es-b',
        },
      ],
      [
        'processing-route-ruled-0',
        'configured-destination-es-c',
        {
          origin: {
            kind: 'processing',
            ref: { kind: 'route', pipelineId: 'ruled', routeIndex: 0 },
          },
          destinationId: 'es-c',
        },
      ],
    ]);
  });

  it('lets "Add routing" put a routing node on lines into a destination it can route', () => {
    expect(
      buildRouted().edges.map(({ source, sourceHandle, target, data }) => [
        source,
        sourceHandle,
        target,
        data?.routingLine,
      ])
    ).toEqual([
      [
        'configured-source-direct-source',
        undefined,
        'configured-destination-es-a',
        { origin: { kind: 'source', id: 'direct-source' }, destinationId: 'es-a' },
      ],
      ['configured-source-routed-source', undefined, 'configured-routing-p-routed', undefined],
      // A rule with several targets cannot delegate one of them to a child pipeline.
      ['configured-routing-p-routed', 'rule-0', 'configured-destination-es-a', undefined],
      ['configured-routing-p-routed', 'rule-1', 'configured-routing-child', undefined],
      [
        'configured-routing-p-routed',
        'rule-2',
        'configured-destination-es-b',
        {
          origin: { kind: 'rule', rule: { pipelineId: 'p-routed', ruleIndex: 2 } },
          destinationId: 'es-b',
        },
      ],
      // A routed child with a plain destinations list is edited as a routing node instead.
      ['configured-routing-child', 'rule-0', 'configured-destination-es-c', undefined],
    ]);
  });

  it('skips sources that are not on the canvas', () => {
    const { edges } = buildRouted([]);

    expect(edges.some(({ source }) => source.startsWith('configured-source-'))).toBe(false);
  });
});

const processingUnit: Unit = {
  unit: {
    sources: [
      { id: 'src', type: 'otlp', supported_telemetry: ['logs'] },
      { id: 'plain', type: 'otlp', supported_telemetry: ['logs'] },
    ],
    destinations: [
      { id: 'es', type: 'elasticsearch', supported_telemetry: ['logs'] },
      { id: 'debug', type: 'debug', supported_telemetry: ['logs'] },
    ],
    pipelines: [
      {
        id: 'p-src',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['src'] },
          {
            name: 'routes',
            value: [
              { when: 'true', action: 'copy', processors: ['mask'], destinations: ['debug'] },
              { pipelines: ['processing-1'] },
            ],
          },
        ],
      },
      {
        id: 'processing-1',
        name: 'Enrich',
        supported_telemetry: ['logs'],
        config: [
          { name: 'processors', value: ['add-fields-1', 'add-fields-2'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
      {
        id: 'p-plain',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['plain'] },
          { name: 'processors', value: ['drop'] },
          { name: 'destinations', value: ['es'] },
        ],
      },
      {
        id: 'p-fixed',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['plain'] },
          { name: 'processors', value: ['parse'] },
          { name: 'routes', value: [{ destinations: ['debug'] }] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

describe('buildUnitCanvasGraph with processing', () => {
  const graph = buildUnitCanvasGraph(processingUnit, ['src', 'plain'], ['es', 'debug']);

  it('creates processing nodes for pipelines, routes and delegated children', () => {
    expect(graph.processingNodes.map(({ id, data }) => [id, data.output])).toEqual([
      ['processing-route-p-src-0', 'reconnect'],
      ['processing-pipeline-processing-1', 'connect'],
      ['processing-pipeline-p-plain', 'connect'],
      ['processing-pipeline-p-fixed', 'fixed'],
    ]);
    expect(graph.processingNodes[1]).toEqual(
      expect.objectContaining({
        type: 'processing',
        deletable: false,
        data: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          title: 'Enrich',
          processorCount: 2,
          editable: true,
          output: 'connect',
        },
      })
    );
  });

  it('places route processing after its rule and pipeline processing before its routing node', () => {
    expect(
      graph.edges.map(({ source, sourceHandle, target, reconnectable, data }) => ({
        source,
        sourceHandle,
        target,
        reconnectable,
        processingTarget: data?.processingTarget,
      }))
    ).toEqual([
      {
        source: 'configured-source-src',
        sourceHandle: undefined,
        target: 'configured-routing-p-src',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-src' },
          position: 'end',
          exists: false,
        },
      },
      {
        source: 'configured-routing-p-src',
        sourceHandle: 'rule-0',
        target: 'processing-route-p-src-0',
        reconnectable: false,
        processingTarget: {
          ref: { kind: 'route', pipelineId: 'p-src', routeIndex: 0 },
          position: 'start',
          exists: true,
        },
      },
      {
        source: 'processing-route-p-src-0',
        sourceHandle: undefined,
        target: 'configured-destination-debug',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'route', pipelineId: 'p-src', routeIndex: 0 },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-routing-p-src',
        sourceHandle: 'rule-1',
        target: 'processing-pipeline-processing-1',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'route', pipelineId: 'p-src', routeIndex: 1 },
          position: 'end',
          exists: false,
        },
      },
      {
        source: 'processing-pipeline-processing-1',
        sourceHandle: undefined,
        target: 'configured-destination-es',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-source-plain',
        sourceHandle: undefined,
        target: 'processing-pipeline-p-plain',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-plain' },
          position: 'start',
          exists: true,
        },
      },
      {
        source: 'processing-pipeline-p-plain',
        sourceHandle: undefined,
        target: 'configured-destination-es',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-plain' },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-source-plain',
        sourceHandle: undefined,
        target: 'processing-pipeline-p-fixed',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-fixed' },
          position: 'start',
          exists: true,
        },
      },
      {
        source: 'processing-pipeline-p-fixed',
        sourceHandle: undefined,
        target: 'configured-routing-p-fixed',
        reconnectable: false,
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-fixed' },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-routing-p-fixed',
        sourceHandle: 'rule-0',
        target: 'configured-destination-debug',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'route', pipelineId: 'p-fixed', routeIndex: 0 },
          position: 'end',
          exists: false,
        },
      },
    ]);
  });

  it('marks fixed lines and telemetry-scoped lines as not editable', () => {
    const scoped = buildUnitCanvasGraph(
      {
        ...processingUnit,
        unit: {
          ...processingUnit.unit,
          pipelines: [
            {
              id: 'scoped',
              supported_telemetry: ['logs', 'metrics'],
              config: [
                { name: 'sources', value: ['src'] },
                { name: 'routes', value: [{ destinations: ['es'] }], telemetry: ['logs'] },
                { name: 'routes', value: [{ destinations: ['debug'] }], telemetry: ['metrics'] },
              ],
            },
          ],
        },
      },
      ['src'],
      ['es', 'debug']
    );

    expect(
      scoped.edges.map(({ reconnectable, className, data }) => [
        reconnectable,
        className,
        data?.editable,
      ])
    ).toEqual([
      [false, 'streamsRoutingConnection nopan', false],
      [false, 'streamsRoutingConnection nopan', false],
      [false, 'streamsRoutingConnection nopan', false],
    ]);
    expect(scoped.routingNodes[0].data.rules.map(({ signals }) => signals)).toEqual([
      ['logs'],
      ['metrics'],
    ]);
  });
});

describe('reading line ends from canvas nodes', () => {
  const sourceNode: ClassicCanvasNode = {
    id: 'configured-source-src',
    type: SOURCE_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { sourceId: 'src', title: 'src', subtitle: 'OTLP' },
  };
  const destinationNode: ClassicCanvasNode = {
    id: 'configured-destination-es',
    type: DESTINATION_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { destinationId: 'es', title: 'es' },
  };
  const graph = buildUnitCanvasGraph(processingUnit, ['src', 'plain'], ['es', 'debug']);
  const nodes = [sourceNode, destinationNode, ...graph.processingNodes, ...graph.routingNodes];

  it('reads sources, rule handles and processing nodes as line origins', () => {
    expect(readLineOrigin(nodes, 'configured-source-src', 'src')).toEqual({
      kind: 'source',
      id: 'src',
    });
    expect(readLineOrigin(nodes, 'configured-routing-p-src', 'rule-1')).toEqual({
      kind: 'rule',
      rule: { pipelineId: 'p-src', ruleIndex: 1 },
    });
    expect(readLineOrigin(nodes, 'configured-routing-p-src', null)).toBeUndefined();
    expect(readLineOrigin(nodes, 'processing-route-p-src-0', null)).toEqual({
      kind: 'processing',
      ref: { kind: 'route', pipelineId: 'p-src', routeIndex: 0 },
    });
    expect(readLineOrigin(nodes, 'processing-pipeline-p-plain', null)).toEqual({
      kind: 'processing',
      ref: { kind: 'pipeline', pipelineId: 'p-plain' },
    });
    expect(readLineOrigin(nodes, 'configured-destination-es', null)).toBeUndefined();
    expect(readLineOrigin(nodes, 'unknown', null)).toBeUndefined();
  });

  it('reads destinations, routing nodes and pipeline processing as line targets', () => {
    expect(readLineTarget(nodes, 'configured-destination-es')).toEqual({
      kind: 'destination',
      id: 'es',
    });
    expect(readLineTarget(nodes, 'configured-routing-p-src')).toEqual({
      kind: 'pipeline',
      id: 'p-src',
    });
    expect(readLineTarget(nodes, 'processing-pipeline-processing-1')).toEqual({
      kind: 'pipeline',
      id: 'processing-1',
    });
    expect(readLineTarget(nodes, 'processing-route-p-src-0')).toBeUndefined();
    expect(readLineTarget(nodes, 'configured-source-src')).toBeUndefined();
  });

  it('only reads well-formed rule handles', () => {
    expect(readRoutingRuleIndex('rule-3')).toBe(3);
    expect(readRoutingRuleIndex('rule--1')).toBeUndefined();
    expect(readRoutingRuleIndex('rule-x')).toBeUndefined();
    expect(readRoutingRuleIndex('src')).toBeUndefined();
    expect(readRoutingRuleIndex(null)).toBeUndefined();
  });
});

describe('withRoutingDiagnostics', () => {
  it('marks the routing node and the rules the last save rejected', () => {
    const { routingNodes } = buildRouted();
    const marked = withRoutingDiagnostics(routingNodes, [
      { code: 'E050', message: 'bad condition', pipelineId: 'p-routed', ruleIndex: 1 },
      { code: 'E017', message: 'no way out', pipelineId: 'p-routed' },
    ]);
    const routed = marked.find(({ data }) => data.pipelineId === 'p-routed');
    expect(routed?.data.diagnostics).toEqual(['bad condition', 'no way out']);
    expect(routed?.data.rules.map(({ diagnostics }) => diagnostics)).toEqual([
      undefined,
      ['bad condition'],
      undefined,
    ]);
    const others = marked.filter(({ data }) => data.pipelineId !== 'p-routed');
    expect(others).toEqual(routingNodes.filter(({ data }) => data.pipelineId !== 'p-routed'));
  });
});
