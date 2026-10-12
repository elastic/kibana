/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { NewPackagePolicy, PackagePolicy } from '../../types';
import { appContextService } from '../app_context';
import { setLogsdbColumnarChoice } from '../epm/packages/update_logsdb_columnar';

/**
 * Applies the `logsdb_columnar` choice carried by the policy editor on `package.logsdb_columnar`.
 *
 * The choice belongs to the installation, not to the policy: it is stored once on the
 * installation saved object and applied to the package's index templates through the same path
 * as the update package API. The caller strips the field before the policy is saved.
 */
export async function handleLogsdbColumnarChoice({
  soClient,
  esClient,
  packagePolicy,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicy: PackagePolicy | NewPackagePolicy;
}) {
  const enabled = packagePolicy.package?.logsdb_columnar;
  if (!packagePolicy.package || enabled === undefined) {
    return;
  }

  await setLogsdbColumnarChoice({
    savedObjectsClient: soClient,
    esClient,
    logger: appContextService.getLogger(),
    pkgName: packagePolicy.package.name,
    enabled,
  });
}
