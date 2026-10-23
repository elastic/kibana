/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../../services/unit_repository';
import {
  canMoveOriginConnection,
  connectOrigin,
  moveOriginConnection,
  readConnectionOrigin,
  readConnectionTarget,
} from './connection_origin';

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

  it('wires an unconnected source to a new direct pipeline', () => {
    const origin = readConnectionOrigin('configured-source-bulk', null);
    const next = origin ? connectOrigin(unit, origin, { kind: 'destination', id: 'es-c' }) : unit;

    expect(readRoutes(next)).toEqual(readRoutes(unit));
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['bulk'] },
      { name: 'destinations', value: ['es-c'] },
    ]);
  });

  it('does not add a second line to a source that feeds a routing node', () => {
    const origin = readConnectionOrigin('configured-source-otlp', null);

    expect(
      origin ? connectOrigin(unit, origin, { kind: 'destination', id: 'es-c' }) : undefined
    ).toBe(unit);
  });

  it('wires a rule handle line into that rule', () => {
    const origin = readConnectionOrigin('configured-routing-p-routed', 'rule-1');
    const next = origin ? connectOrigin(unit, origin, { kind: 'destination', id: 'es-c' }) : unit;

    expect(next.unit.pipelines).toHaveLength(1);
    expect(readRoutes(next)).toEqual([
      { when: 'true', destinations: ['es-a'] },
      { destinations: ['es-b', 'es-c'] },
    ]);
  });

  it('moves a routed line onto an unconnected source as a direct wire', () => {
    const next = moveOriginConnection(unit, {
      previousOrigin: { kind: 'route', rule: { pipelineId: 'p-routed', ruleIndex: 0 } },
      previousTarget: { kind: 'destination', id: 'es-a' },
      origin: { kind: 'source', sourceId: 'bulk' },
      target: { kind: 'destination', id: 'es-a' },
    });

    expect(readRoutes(next)).toEqual([{ destinations: ['es-b'] }]);
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['bulk'] },
      { name: 'destinations', value: ['es-a'] },
    ]);
  });

  it('reads destinations and routing nodes as line targets', () => {
    expect(readConnectionTarget('configured-destination-es-a')).toEqual({
      kind: 'destination',
      id: 'es-a',
    });
    expect(readConnectionTarget('configured-routing-p-routed')).toEqual({
      kind: 'pipeline',
      id: 'p-routed',
    });
    expect(readConnectionTarget('configured-source-otlp')).toBeUndefined();
  });

  it('lets a connected source move its line but not onto a routing node', () => {
    const direct: Unit = {
      ...unit,
      unit: {
        ...unit.unit,
        pipelines: [
          {
            id: 'p-bulk',
            supported_telemetry: ['logs'],
            config: [
              { name: 'sources', value: ['bulk'] },
              { name: 'destinations', value: ['es-a'] },
            ],
          },
          ...unit.unit.pipelines,
        ],
      },
    };
    const move = {
      previousOrigin: { kind: 'source', sourceId: 'bulk' },
      previousTarget: { kind: 'destination', id: 'es-a' },
      origin: { kind: 'source', sourceId: 'bulk' },
    } as const;

    expect(
      canMoveOriginConnection(direct, { ...move, target: { kind: 'destination', id: 'es-c' } })
    ).toBe(true);
    expect(
      canMoveOriginConnection(direct, { ...move, target: { kind: 'pipeline', id: 'p-routed' } })
    ).toBe(false);
  });
});
