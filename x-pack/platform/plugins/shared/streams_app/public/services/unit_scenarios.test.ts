/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unitScenarios } from './__fixtures__/unit_scenarios';
import { getUnconnectedPipelines } from './unit_connections';
import {
  buildUnitGraph,
  endpointKey,
  processingNodeId,
  type UnitGraph,
  type UnitGraphEdge,
} from './unit_graph';

const describeNodes = ({ processingNodes, routingNodes }: UnitGraph): string[] => [
  ...processingNodes.map(
    ({ ref, editable }) => `processing:${processingNodeId(ref)}${editable ? '' : ' (locked)'}`
  ),
  ...routingNodes.map(
    ({ pipelineId, synthetic }) => `routing:${pipelineId}${synthetic ? ' (synthetic)' : ''}`
  ),
];

const describeEdge = ({ source, target, reference, editable }: UnitGraphEdge): string =>
  `${endpointKey(source)} -> ${endpointKey(target)} via ${reference?.kind ?? 'structure'}${
    editable ? '' : ' (locked)'
  }`;

describe.each(unitScenarios)(
  'unit scenario: $name',
  ({ unit, sourceIds, destinationIds, nodes, edges, unconnected = [], manipulations = [] }) => {
    const graph = buildUnitGraph(
      unit,
      new Set(sourceIds ?? unit.unit.sources.map(({ id }) => id)),
      new Set(destinationIds ?? unit.unit.destinations.map(({ id }) => id))
    );

    it('draws the expected nodes', () => {
      expect(describeNodes(graph)).toEqual(nodes);
    });

    it('draws the expected lines', () => {
      expect(graph.edges.map(describeEdge)).toEqual(edges);
    });

    it('reports the pipelines that cannot be saved', () => {
      expect(
        getUnconnectedPipelines(unit).map(({ pipeline, reason }) => ({
          pipelineId: pipeline.id,
          reason,
        }))
      ).toEqual(unconnected);
    });

    manipulations.forEach((manipulation) => {
      it(manipulation.name, () => {
        const result = manipulation.apply(unit);
        if ('refused' in manipulation) {
          expect(result).toBe(unit);
          return;
        }
        expect(result).not.toBe(unit);
        expect(result.unit.pipelines).toEqual(manipulation.pipelines);
      });
    });
  }
);
