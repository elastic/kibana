/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsdbColumnarReadiness, RegistryDataStream } from '../types';

/**
 * The Elasticsearch index mode Fleet writes to `settings.index.mode` when a logs data stream is
 * switched to columnar storage. It is not a value a package can put in
 * `elasticsearch.index_mode`; packages declare readiness with `elasticsearch.logsdb_columnar`
 * instead (package-spec 3.8.0).
 */
export const LOGSDB_COLUMNAR_INDEX_MODE = 'logsdb_columnar';

/** Minimal shape of the package manifest fields this module needs. */
export interface ColumnarPackageInfo {
  elasticsearch?: {
    logsdb_columnar?: Exclude<LogsdbColumnarReadiness, 'unsupported'>;
  };
}

/**
 * Resolves the effective columnar readiness of a data stream: the data stream's own
 * `elasticsearch.logsdb_columnar` if set, otherwise the package-level one.
 *
 * Returns `undefined` when nothing is declared, when the data stream is not of type `logs`
 * (the setting is ignored for any other type), or when the data stream declares an
 * `elasticsearch.index_mode` — `index_mode` and `logsdb_columnar` are mutually exclusive and the
 * spec validator rejects the combination, so `index_mode` wins here defensively.
 */
export function getLogsdbColumnarReadiness(
  packageInfo: ColumnarPackageInfo | undefined,
  dataStream: Pick<RegistryDataStream, 'type' | 'elasticsearch'>
): LogsdbColumnarReadiness | undefined {
  if (dataStream.type !== 'logs') {
    return undefined;
  }
  if (dataStream.elasticsearch?.index_mode) {
    return undefined;
  }
  return dataStream.elasticsearch?.logsdb_columnar ?? packageInfo?.elasticsearch?.logsdb_columnar;
}

/**
 * True when the readiness value means the data stream may be put in the `logsdb_columnar` index
 * mode (`opt_in` or `default`). `unsupported` and `undefined` are not ready.
 */
export function isLogsdbColumnarReady(readiness?: LogsdbColumnarReadiness): boolean {
  return readiness === 'opt_in' || readiness === 'default';
}

/**
 * The logs data streams of a package that are not columnar-ready (`unsupported`, or no readiness
 * declared at either level). The integration can only be switched to the `logsdb_columnar` index
 * mode when this is empty: every logs data stream has to be ready.
 */
export function getLogsdbColumnarNotReadyDataStreams<
  T extends Pick<RegistryDataStream, 'type' | 'elasticsearch'>
>(packageInfo: ColumnarPackageInfo | undefined, dataStreams: T[] = []): T[] {
  return dataStreams.filter(
    (dataStream) =>
      dataStream.type === 'logs' &&
      !isLogsdbColumnarReady(getLogsdbColumnarReadiness(packageInfo, dataStream))
  );
}

/**
 * Whether a new installation of the package starts on `logsdb_columnar`: every logs data stream
 * is ready for it, and defaults to it.
 */
export function isLogsdbColumnarDefault(
  packageInfo: (ColumnarPackageInfo & { data_streams?: RegistryDataStream[] }) | undefined
): boolean {
  const logsDataStreams = (packageInfo?.data_streams ?? []).filter(({ type }) => type === 'logs');
  return (
    logsDataStreams.length > 0 &&
    getLogsdbColumnarNotReadyDataStreams(packageInfo, logsDataStreams).length === 0 &&
    logsDataStreams.every(
      (dataStream) => getLogsdbColumnarReadiness(packageInfo, dataStream) === 'default'
    )
  );
}
