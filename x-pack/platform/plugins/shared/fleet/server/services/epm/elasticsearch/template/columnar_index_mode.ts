/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarReadiness,
  getRegistryDataStreamAssetBaseName,
  isLogsdbColumnarDefault,
  isLogsdbColumnarReady,
} from '../../../../../common/services';
import type { ColumnarPackageInfo } from '../../../../../common/services/columnar_index_mode';
import type { Installation, RegistryDataStream } from '../../../../types';

type ColumnarPackage = ColumnarPackageInfo & { data_streams?: RegistryDataStream[] };

/**
 * The index mode of each logs data stream of a package, keyed by its index template name:
 * `logsdb_columnar` when the installation is on it and the data stream is ready for it.
 *
 * An existing installation follows the choice stored on it, which a new installation of a
 * `default` package starts with (see `createInstallation`), so an installation never changes mode
 * on its own. Package versions keep their logs data streams ready once declared, and only add
 * ready ones, so nothing else needs resolving here.
 */
export function resolveColumnarIndexModes({
  packageInfo,
  dataStreams,
  installedPkg,
}: {
  packageInfo: ColumnarPackage;
  dataStreams: RegistryDataStream[];
  installedPkg?: Installation;
}): Map<string, string | undefined> {
  const enabled = installedPkg
    ? installedPkg.logsdb_columnar_enabled === true
    : isLogsdbColumnarDefault(packageInfo);

  return new Map(
    dataStreams
      .filter(({ type }) => type === 'logs')
      .map((dataStream) => [
        getRegistryDataStreamAssetBaseName(dataStream),
        enabled && isLogsdbColumnarReady(getLogsdbColumnarReadiness(packageInfo, dataStream))
          ? LOGSDB_COLUMNAR_INDEX_MODE
          : undefined,
      ])
  );
}
