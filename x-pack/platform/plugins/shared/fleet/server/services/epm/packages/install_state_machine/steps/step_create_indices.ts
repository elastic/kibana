/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installConcreteIndicesFromTemplates } from '../../../elasticsearch/index/install';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';

/**
 * After index templates are installed, create empty concrete indices for packages
 * that ship fixed index names (non-wildcard index_patterns). This makes dependent
 * workflows and dashboards usable immediately without waiting for a first write.
 *
 * Existing indices are left untouched. Uninstall does not delete these indices.
 */
export async function stepCreateIndices(context: InstallContext) {
  const { packageInstallContext, esClient, savedObjectsClient, logger, installedPkg } = context;

  let esReferences = context.esReferences ?? installedPkg?.attributes.installed_es ?? [];

  esReferences = await withPackageSpan('Create concrete indices from templates', () =>
    installConcreteIndicesFromTemplates(
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences
    )
  );

  return { esReferences };
}
