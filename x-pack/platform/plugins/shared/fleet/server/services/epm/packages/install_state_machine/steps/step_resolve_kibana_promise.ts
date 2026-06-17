/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallContext } from '../_state_machine_package_install';

export async function stepResolveKibanaPromise(context: InstallContext) {
  const { kibanaAssetPromise } = context;
  const installedKibanaAssetsRefs = await kibanaAssetPromise;

  return { installedKibanaAssetsRefs };
}
