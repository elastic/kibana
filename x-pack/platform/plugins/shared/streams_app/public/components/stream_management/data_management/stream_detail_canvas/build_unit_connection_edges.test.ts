/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { getUnitRoutings } from '../../../streams_layout/routing/routing_models';
import { buildRoutingEdges, buildUnitConnectionEdges } from './build_unit_connection_edges';

const unit: StreamsUnit.GetResponse = {
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

describe('buildUnitConnectionEdges', () => {
  it('only draws direct connections, leaving routed ones to routing nodes', () => {
    expect(
      buildUnitConnectionEdges(unit, sourceIds, destinationIds).map(({ source, target }) => [
        source,
        target,
      ])
    ).toEqual([['configured-source-direct-source', 'configured-destination-es-a']]);
  });
});

describe('buildRoutingEdges', () => {
  it('connects sources to routing nodes and each rule handle to its targets', () => {
    const edges = buildRoutingEdges(getUnitRoutings(unit), sourceIds, destinationIds);

    expect(edges.map(({ source, sourceHandle, target }) => [source, sourceHandle, target])).toEqual(
      [
        ['configured-source-routed-source', undefined, 'configured-routing-p-routed'],
        ['configured-routing-p-routed', 'rule-0', 'configured-destination-es-a'],
        ['configured-routing-p-routed', 'rule-1', 'configured-routing-child'],
        ['configured-routing-p-routed', 'rule-2', 'configured-destination-es-b'],
        ['configured-routing-child', 'rule-0', 'configured-destination-es-c'],
      ]
    );
  });

  it('lets every rule line be moved, but not lines into a routing node', () => {
    const edges = buildRoutingEdges(getUnitRoutings(unit), sourceIds, destinationIds);

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
    const edges = buildRoutingEdges(getUnitRoutings(unit), [], destinationIds);

    expect(edges.some(({ source }) => source.startsWith('configured-source-'))).toBe(false);
  });
});
