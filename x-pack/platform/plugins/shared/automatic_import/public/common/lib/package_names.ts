/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstalledPackages, getAllIntegrations, type RequestDeps } from './api';
import { normalizeTitleName } from './helper_functions';

export const fetchTakenPackageNames = async (deps: RequestDeps): Promise<Set<string>> => {
  const [packagesResponse, aiv2Integrations] = await Promise.all([
    getInstalledPackages(deps),
    getAllIntegrations(deps),
  ]);

  const takenNames = new Set<string>();
  packagesResponse?.items?.forEach((pkg) => takenNames.add(pkg.id));
  aiv2Integrations?.forEach((integration) => {
    // Package also requires the integration ID to be checked
    takenNames.add(integration.integrationId);
    takenNames.add(normalizeTitleName(integration.title));
  });

  return takenNames;
};
