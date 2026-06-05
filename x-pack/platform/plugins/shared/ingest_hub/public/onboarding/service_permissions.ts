/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_SERVICES_MATRIX } from './aws_service_matrix';
import { resolveProviderPermissions } from './resolve_provider_permissions';

export interface AwsServicePermissions {
  id: string;
  name: string;
  actions: string[];
}

const SERVICE_MAP = new Map(AWS_SERVICES_MATRIX.map((entry) => [entry.id, entry]));

/**
 * Returns IAM actions per selected service for display in the permissions viewer.
 * Services without provider permissions (non-agentless, unknown ids) are omitted.
 */
export function getSelectedServicePermissions(serviceIds: string[]): AwsServicePermissions[] {
  return serviceIds.flatMap((id) => {
    const entry = SERVICE_MAP.get(id);
    const { actions } = resolveProviderPermissions(id);

    if (actions.length === 0) {
      return [];
    }

    return [
      {
        id,
        name: entry?.name ?? id,
        actions,
      },
    ];
  });
}
