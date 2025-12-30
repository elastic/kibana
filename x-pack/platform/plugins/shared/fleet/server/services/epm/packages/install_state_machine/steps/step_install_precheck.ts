/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureFleetGlobalEsAssets } from '../../../../setup/ensure_fleet_global_es_assets';
import { appContextService } from '../../../..';

import { withPackageSpan } from '../../utils';

export async function stepInstallPrecheck() {
  await ensureFleetGlobalAssets();
}

async function ensureFleetGlobalAssets() {
  await withPackageSpan('Ensure Fleet Global Assets', () =>
    ensureFleetGlobalEsAssets(
      {
        logger: appContextService.getLogger(),
        esClient: appContextService.getInternalUserESClient(),
        soClient: appContextService.getInternalUserSOClient(),
      },
      {
        reinstallPackages: false,
      }
    )
  );
}
