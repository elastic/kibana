/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { Installation, PackagePolicy } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../..';

export async function assertUninstallAuthorizedForAffectedSpaces({
  request,
  pkgName,
  installation,
  packagePolicies,
}: {
  request: KibanaRequest;
  pkgName: string;
  installation: Installation;
  packagePolicies: PackagePolicy[];
}): Promise<void> {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!security.authz.mode.useRbacForRequest(request)) {
    return;
  }

  // Collect all affected space IDs
  const spaceIds = new Set<string>();

  // Add spaces from package policies
  for (const policy of packagePolicies) {
    if (policy.spaceIds && policy.spaceIds.length > 0) {
      for (const spaceId of policy.spaceIds) {
        spaceIds.add(spaceId);
      }
    }
  }

  // Add the primary installation space
  spaceIds.add(installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID);

  // Add any additional spaces where kibana assets were installed
  for (const spaceId of Object.keys(installation.additional_spaces_installed_kibana ?? {})) {
    spaceIds.add(spaceId);
  }

  const spaceIdsArray = Array.from(spaceIds);

  const { authz } = security;
  const result = await authz.checkPrivilegesWithRequest(request).atSpaces(spaceIdsArray, {
    kibana: [
      authz.actions.api.get('integrations-all'),
      authz.actions.api.get('fleet-agent-policies-all'),
    ],
  });

  if (!result.hasAllRequested) {
    throw new FleetUnauthorizedError(
      `Insufficient privileges to uninstall package ${pkgName}: it is used in spaces you are not authorized to access`
    );
  }
}
