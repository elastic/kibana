/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_DESTINATIONS_MANAGED_BY = 'streams';

export const DESTINATION_API_KEY_CLUSTER_PRIVILEGE = 'manage_own_api_key';
export const DESTINATION_API_KEY_INDEX_PRIVILEGES = ['create_doc', 'auto_configure'] as const;

export const createDestinationApiKeyRoleDescriptors = (
  patterns: string[]
): {
  streams_destination: {
    indices: Array<{
      names: string[];
      privileges: Array<(typeof DESTINATION_API_KEY_INDEX_PRIVILEGES)[number]>;
    }>;
  };
} => ({
  streams_destination: {
    indices: [
      {
        names: patterns,
        privileges: [...DESTINATION_API_KEY_INDEX_PRIVILEGES],
      },
    ],
  },
});

export const createDestinationApiKeyPrivilegeCheck = (patterns: string[]) => ({
  cluster: [DESTINATION_API_KEY_CLUSTER_PRIVILEGE],
  index: [
    {
      names: patterns,
      privileges: [...DESTINATION_API_KEY_INDEX_PRIVILEGES],
    },
  ],
});

export type DestinationApiKeyPrivilegeFailure = 'none' | 'cluster' | 'index';

export interface DestinationApiKeyPrivilegeResult {
  canCreate: boolean;
  failure: DestinationApiKeyPrivilegeFailure;
  missingPatterns: string[];
}

export const interpretDestinationApiKeyPrivileges = ({
  canManageApiKeys,
  missingPatterns,
}: {
  canManageApiKeys: boolean;
  missingPatterns: string[];
}): DestinationApiKeyPrivilegeResult => {
  if (!canManageApiKeys) {
    return { canCreate: false, failure: 'cluster', missingPatterns: [] };
  }
  if (missingPatterns.length > 0) {
    return { canCreate: false, failure: 'index', missingPatterns };
  }
  return { canCreate: true, failure: 'none', missingPatterns: [] };
};

export const isOwnedByDestination = ({
  metadata,
  destinationId,
  unitId,
}: {
  metadata: Record<string, unknown> | undefined;
  destinationId: string;
  unitId?: string;
}): boolean =>
  metadata?.managed_by === STREAMS_DESTINATIONS_MANAGED_BY &&
  metadata?.streams_destination_id === destinationId &&
  (unitId === undefined || metadata?.streams_unit_id === unitId);
