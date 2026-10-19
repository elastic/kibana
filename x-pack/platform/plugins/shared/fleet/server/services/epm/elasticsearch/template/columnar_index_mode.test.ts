/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Installation, RegistryDataStream } from '../../../../types';

import { resolveColumnarIndexModes } from './columnar_index_mode';

const dataStream = (props: Partial<RegistryDataStream>): RegistryDataStream =>
  ({
    type: 'logs',
    dataset: 'pkg.ds',
    package: 'pkg',
    path: 'ds',
    title: 'ds',
    release: 'ga',
    ...props,
  } as RegistryDataStream);

const logs = dataStream({});
const otherLogs = dataStream({ dataset: 'pkg.other', path: 'other' });
const metrics = dataStream({ type: 'metrics', dataset: 'pkg.metrics', path: 'metrics' });

const packageInfo = (
  readiness: 'opt_in' | 'default',
  dataStreams = [logs, otherLogs, metrics]
) => ({
  elasticsearch: { logsdb_columnar: readiness },
  data_streams: dataStreams,
});

const installed = (logsdbColumnarEnabled?: boolean) =>
  ({
    name: 'pkg',
    version: '1.0.0',
    logsdb_columnar_enabled: logsdbColumnarEnabled,
  } as Installation);

describe('resolveColumnarIndexModes', () => {
  it('puts a new installation of a `default` package on columnar', () => {
    const info = packageInfo('default');

    expect(
      Object.fromEntries(
        resolveColumnarIndexModes({ packageInfo: info, dataStreams: info.data_streams })
      )
    ).toEqual({ 'logs-pkg.ds': 'logsdb_columnar', 'logs-pkg.other': 'logsdb_columnar' });
  });

  it('leaves a new installation of an `opt_in` package on LogsDB', () => {
    const info = packageInfo('opt_in');

    expect([
      ...resolveColumnarIndexModes({ packageInfo: info, dataStreams: info.data_streams }).values(),
    ]).toEqual([undefined, undefined]);
  });

  it('follows the choice stored on an existing installation', () => {
    const info = packageInfo('opt_in');

    expect(
      resolveColumnarIndexModes({
        packageInfo: info,
        dataStreams: [logs],
        installedPkg: installed(true),
      }).get('logs-pkg.ds')
    ).toEqual('logsdb_columnar');
  });

  it('never moves an existing installation without a choice, even to a `default` version', () => {
    const info = packageInfo('default');

    expect(
      resolveColumnarIndexModes({
        packageInfo: info,
        dataStreams: info.data_streams,
        installedPkg: installed(),
      }).get('logs-pkg.ds')
    ).toBeUndefined();
  });

  it('keeps a data stream that is not ready on LogsDB', () => {
    const unsupported = dataStream({ elasticsearch: { logsdb_columnar: 'unsupported' } });

    expect(
      resolveColumnarIndexModes({
        packageInfo: packageInfo('opt_in', [unsupported]),
        dataStreams: [unsupported],
        installedPkg: installed(true),
      }).get('logs-pkg.ds')
    ).toBeUndefined();
  });
});
