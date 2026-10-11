/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryDataStream } from '../types';

import { getLogsdbColumnarReadiness, isLogsdbColumnarReady } from './columnar_index_mode';

const dataStream = (props: Partial<RegistryDataStream> = {}): RegistryDataStream =>
  ({
    type: 'logs',
    dataset: 'pkg.ds',
    package: 'pkg',
    path: 'ds',
    title: 'ds',
    release: 'ga',
    ...props,
  } as RegistryDataStream);

describe('getLogsdbColumnarReadiness', () => {
  it('returns undefined when nothing is declared', () => {
    expect(getLogsdbColumnarReadiness({}, dataStream())).toBeUndefined();
    expect(getLogsdbColumnarReadiness(undefined, dataStream())).toBeUndefined();
  });

  it('falls back to the package-level value', () => {
    expect(
      getLogsdbColumnarReadiness({ elasticsearch: { logsdb_columnar: 'opt_in' } }, dataStream())
    ).toEqual('opt_in');
  });

  it('lets the data stream value override the package-level value', () => {
    expect(
      getLogsdbColumnarReadiness(
        { elasticsearch: { logsdb_columnar: 'default' } },
        dataStream({ elasticsearch: { logsdb_columnar: 'unsupported' } })
      )
    ).toEqual('unsupported');
  });

  it('uses the data stream value when the package declares nothing', () => {
    expect(
      getLogsdbColumnarReadiness({}, dataStream({ elasticsearch: { logsdb_columnar: 'default' } }))
    ).toEqual('default');
  });

  it('ignores readiness for data streams that are not logs', () => {
    expect(
      getLogsdbColumnarReadiness(
        { elasticsearch: { logsdb_columnar: 'default' } },
        dataStream({ type: 'metrics', elasticsearch: { logsdb_columnar: 'opt_in' } })
      )
    ).toBeUndefined();
  });

  it('ignores readiness when the data stream declares an index_mode', () => {
    expect(
      getLogsdbColumnarReadiness(
        { elasticsearch: { logsdb_columnar: 'default' } },
        dataStream({ elasticsearch: { index_mode: 'time_series' } })
      )
    ).toBeUndefined();
  });
});

describe('isLogsdbColumnarReady', () => {
  it.each([
    ['opt_in', true],
    ['default', true],
    ['unsupported', false],
    [undefined, false],
  ] as const)('%s -> %s', (readiness, expected) => {
    expect(isLogsdbColumnarReady(readiness)).toBe(expected);
  });
});
