/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../../services/unit_repository';
import { buildUnitCanvasGraph } from './build_unit_connection_edges';

const unit: Unit = {
  unit: {
    sources: [{ id: 'src', type: 'otlp', supported_telemetry: ['logs'] }],
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
              { when: 'true', action: 'copy', destinations: ['debug'] },
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
    ],
  },
  ui_metadata: {},
};

describe('buildUnitCanvasGraph', () => {
  const graph = buildUnitCanvasGraph(unit, ['src'], ['es', 'debug']);

  it('creates a processing node per processing pipeline', () => {
    expect(graph.processingNodes).toEqual([
      expect.objectContaining({
        id: 'processing-pipeline-processing-1',
        type: 'processing',
        deletable: false,
        data: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          title: 'Enrich',
          processorCount: 2,
          editable: true,
        },
      }),
    ]);
  });

  it('lets lines into destinations be reconnected and passes each line its processing slot', () => {
    expect(
      graph.edges.map(({ id, source, target, reconnectable, data }) => ({
        id,
        source,
        target,
        reconnectable,
        processingTarget: data?.processingTarget,
      }))
    ).toEqual([
      {
        id: 'unit-connection-src->debug',
        source: 'configured-source-src',
        target: 'configured-destination-debug',
        reconnectable: true,
        processingTarget: {
          ref: { kind: 'route', pipelineId: 'p-src', routeIndex: 0 },
          position: 'end',
          exists: false,
        },
      },
      {
        id: 'unit-connection-configured-source-src->processing-pipeline-processing-1',
        source: 'configured-source-src',
        target: 'processing-pipeline-processing-1',
        reconnectable: false,
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          position: 'start',
          exists: true,
        },
      },
      {
        id: 'unit-connection-processing-pipeline-processing-1->configured-destination-es',
        source: 'processing-pipeline-processing-1',
        target: 'configured-destination-es',
        reconnectable: true,
        processingTarget: {
          ref: { kind: 'pipeline', pipelineId: 'processing-1' },
          position: 'end',
          exists: true,
        },
      },
    ]);
  });
});
