/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../../services/unit_repository';
import { connectOrigin, moveOriginConnection, readConnectionOrigin } from './connection_origin';

const unit: Unit = {
  unit: {
    sources: [],
    destinations: [],
    pipelines: [
      {
        id: 'p-routed',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp'] },
          {
            name: 'routes',
            value: [{ when: 'true', destinations: ['es-a'] }, { destinations: ['es-b'] }],
          },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const readRoutes = (next: Unit) =>
  next.unit.pipelines
    .find(({ id }) => id === 'p-routed')
    ?.config.find((entry) => entry.name === 'routes')?.value;

describe('connection origin', () => {
  it('reads source nodes and routing rule handles', () => {
    expect(readConnectionOrigin('configured-source-otlp', null)).toEqual({
      kind: 'source',
      sourceId: 'otlp',
    });
    expect(readConnectionOrigin('configured-routing-p-routed', 'rule-1')).toEqual({
      kind: 'route',
      rule: { pipelineId: 'p-routed', ruleIndex: 1 },
    });
    expect(readConnectionOrigin('configured-routing-p-routed', null)).toBeUndefined();
    expect(readConnectionOrigin('configured-destination-es-a', null)).toBeUndefined();
  });

  it('wires a source line to a new direct pipeline, not to its routing node', () => {
    const origin = readConnectionOrigin('configured-source-otlp', null);
    const next = origin ? connectOrigin(unit, origin, 'es-c') : unit;

    expect(readRoutes(next)).toEqual(readRoutes(unit));
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['otlp'] },
      { name: 'destinations', value: ['es-c'] },
    ]);
  });

  it('wires a rule handle line into that rule', () => {
    const origin = readConnectionOrigin('configured-routing-p-routed', 'rule-1');
    const next = origin ? connectOrigin(unit, origin, 'es-c') : unit;

    expect(next.unit.pipelines).toHaveLength(1);
    expect(readRoutes(next)).toEqual([
      { when: 'true', destinations: ['es-a'] },
      { destinations: ['es-b', 'es-c'] },
    ]);
  });

  it('moves a routed line onto a source as a direct wire', () => {
    const next = moveOriginConnection(unit, {
      previousOrigin: { kind: 'route', rule: { pipelineId: 'p-routed', ruleIndex: 0 } },
      previousDestinationId: 'es-a',
      origin: { kind: 'source', sourceId: 'otlp' },
      destinationId: 'es-a',
    });

    expect(readRoutes(next)).toEqual([{ destinations: ['es-b'] }]);
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['otlp'] },
      { name: 'destinations', value: ['es-a'] },
    ]);
  });
});
