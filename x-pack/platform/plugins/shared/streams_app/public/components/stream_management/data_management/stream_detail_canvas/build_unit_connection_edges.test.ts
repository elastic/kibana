/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../../services/unit_repository';
import { getUnitRoutings } from '../../../streams_layout/routing/routing_models';
import { buildUnitCanvasGraph } from './build_unit_connection_edges';

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
  buildUnitCanvasGraph(routedUnit, shownSourceIds, destinationIds, getUnitRoutings(routedUnit));

describe('buildUnitCanvasGraph with routing nodes', () => {
  it('draws direct lines from the unit graph and routed lines through routing nodes', () => {
    expect(
      buildRouted().edges.map(({ source, sourceHandle, target }) => [source, sourceHandle, target])
    ).toEqual([
      ['configured-source-direct-source', undefined, 'configured-destination-es-a'],
      ['configured-source-routed-source', undefined, 'configured-routing-p-routed'],
      ['configured-routing-p-routed', 'rule-0', 'configured-destination-es-a'],
      ['configured-routing-p-routed', 'rule-1', 'configured-routing-child'],
      ['configured-routing-p-routed', 'rule-2', 'configured-destination-es-b'],
      ['configured-routing-child', 'rule-0', 'configured-destination-es-c'],
    ]);
  });

  it('lets every rule line be moved, but not lines into a routing node', () => {
    const edges = buildRouted().edges.filter(({ data }) => data?.routing);

    expect(new Set(edges.map(({ id }) => id)).size).toBe(edges.length);
    expect(
      edges.map(({ target, reconnectable, data }) => [target, reconnectable, data?.unitConnection])
    ).toEqual([
      ['configured-routing-p-routed', false, false],
      ['configured-destination-es-a', 'target', true],
      ['configured-routing-child', 'target', true],
      ['configured-destination-es-b', 'target', true],
      ['configured-destination-es-c', 'target', true],
    ]);
    edges.forEach((edge) => {
      expect(edge).toMatchObject({ deletable: false, selectable: false });
    });
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
    ],
  },
  ui_metadata: {},
};

describe('buildUnitCanvasGraph with processing', () => {
  const graph = buildUnitCanvasGraph(
    processingUnit,
    ['src', 'plain'],
    ['es', 'debug'],
    getUnitRoutings(processingUnit)
  );

  it('creates processing nodes for plain pipelines, routing pipelines and routes', () => {
    expect(graph.processingNodes.map(({ id, data }) => [id, data.output])).toEqual([
      ['processing-pipeline-p-plain', 'connect'],
      ['processing-route-p-src-0', 'reconnect'],
      ['processing-pipeline-processing-1', 'fixed'],
    ]);
    expect(graph.processingNodes[2]).toEqual(
      expect.objectContaining({
        type: 'processing',
        deletable: false,
        data: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          title: 'Enrich',
          processorCount: 2,
          editable: true,
          output: 'fixed',
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
        source: 'configured-source-plain',
        sourceHandle: undefined,
        target: 'processing-pipeline-p-plain',
        reconnectable: false,
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
        reconnectable: true,
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'p-plain' },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-source-src',
        sourceHandle: undefined,
        target: 'configured-routing-p-src',
        reconnectable: false,
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
        target: 'configured-routing-processing-1',
        reconnectable: false,
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          position: 'end',
          exists: true,
        },
      },
      {
        source: 'configured-routing-processing-1',
        sourceHandle: 'rule-0',
        target: 'configured-destination-es',
        reconnectable: 'target',
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          position: 'end',
          exists: true,
        },
      },
    ]);
  });
});
