/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { getUnitRoutings } from './routing_models';

const unitWithPipelines = (pipelines: StreamsUnit.Pipeline[]): StreamsUnit.GetResponse => ({
  unit: { sources: [], destinations: [], pipelines },
  ui_metadata: {},
});

describe('routing models', () => {
  it('ignores pipelines that only forward to a destinations list', () => {
    expect(
      getUnitRoutings(
        unitWithPipelines([
          {
            id: 'p-otlp',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['otlp'] },
              { name: 'destinations', value: ['es'] },
            ],
          },
        ])
      )
    ).toEqual([]);
  });

  it('maps each route of a source pipeline to a rule', () => {
    expect(
      getUnitRoutings(
        unitWithPipelines([
          {
            id: 'p-otlp',
            name: 'OTLP routing',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['otlp', 'bulk'] },
              {
                name: 'routes',
                value: [
                  {
                    when: 'resource.attributes["env"] == "prod"',
                    action: 'copy',
                    processors: ['add-prod-tags'],
                    destinations: ['es-prod', 's3-archive'],
                  },
                  { destinations: ['es-default'] },
                ],
              },
            ],
          },
        ])
      )
    ).toEqual([
      {
        id: 'p-otlp',
        name: 'OTLP routing',
        sourceIds: ['otlp', 'bulk'],
        rules: [
          {
            index: 0,
            when: 'resource.attributes["env"] == "prod"',
            action: 'copy',
            targets: [
              { kind: 'destination', id: 'es-prod' },
              { kind: 'destination', id: 's3-archive' },
            ],
          },
          {
            index: 1,
            when: undefined,
            action: undefined,
            targets: [{ kind: 'destination', id: 'es-default' }],
          },
        ],
      },
    ]);
  });

  it('chains routes that forward to other pipelines', () => {
    const routings = getUnitRoutings(
      unitWithPipelines([
        {
          id: 'p-otlp',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp'] },
            {
              name: 'routes',
              value: [{ when: 'true', pipelines: ['child-routes', 'child-direct'] }],
            },
          ],
        },
        {
          id: 'child-routes',
          supported_telemetry: ['logs'],
          config: [{ name: 'routes', value: [{ destinations: ['es-a'] }] }],
        },
        {
          id: 'child-direct',
          supported_telemetry: ['logs'],
          config: [
            { name: 'processors', value: ['enrich'] },
            { name: 'destinations', value: ['es-b', 'es-c'] },
          ],
        },
      ])
    );

    expect(routings.map(({ id }) => id)).toEqual(['p-otlp', 'child-routes', 'child-direct']);
    expect(routings[0].rules[0].targets).toEqual([
      { kind: 'pipeline', id: 'child-routes' },
      { kind: 'pipeline', id: 'child-direct' },
    ]);
    expect(routings[1]).toMatchObject({ sourceIds: [], rules: [{ index: 0, when: undefined }] });
    expect(routings[2]).toEqual({
      id: 'child-direct',
      name: undefined,
      sourceIds: [],
      rules: [
        {
          index: 0,
          targets: [
            { kind: 'destination', id: 'es-b' },
            { kind: 'destination', id: 'es-c' },
          ],
        },
      ],
    });
  });
});
