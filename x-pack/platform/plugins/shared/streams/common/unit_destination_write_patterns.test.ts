/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getUnitDestinationWritePatterns,
  type UnitDestination,
} from './unit_destination_write_patterns';

const elasticsearch = (config: UnitDestination['config'], telemetry?: string[]): UnitDestination =>
  ({
    id: 'es',
    name: 'ES',
    type: 'elasticsearch',
    supported_telemetry: telemetry,
    config,
  } as UnitDestination);

describe('getUnitDestinationWritePatterns', () => {
  it('returns nothing for non-elasticsearch destinations', () => {
    expect(
      getUnitDestinationWritePatterns({
        id: 'debug-out',
        name: 'Debug',
        type: 'debug',
        supported_telemetry: ['logs'],
      } as UnitDestination)
    ).toEqual([]);
  });

  it('uses a static index when present', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'index', value: 'logs-app-default' }], ['logs'])
      )
    ).toEqual(['logs-app-default']);
  });

  it('uses index_patterns for auto destinations', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'index_patterns', value: ['logs-*-*', 'metrics-*-*'] }])
      )
    ).toEqual(['logs-*-*', 'metrics-*-*']);
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'index_patterns', value: 'logs-billing-*' }])
      )
    ).toEqual(['logs-billing-*']);
  });

  it('falls back to signal auto patterns when neither index nor index_patterns is set', () => {
    expect(getUnitDestinationWritePatterns(elasticsearch([], ['logs', 'traces']))).toEqual([
      'logs-*-*',
      'traces-*-*',
    ]);
  });
});
