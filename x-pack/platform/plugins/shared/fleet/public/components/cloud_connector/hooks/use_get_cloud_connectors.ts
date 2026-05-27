/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../../common';
import {
  getPolicyGroupForIntegration,
  CLOUD_CONNECTOR_PERMISSION_ALLOWLIST,
} from '../../../../common/constants/cloud_connector';
import type { PolicyGroup } from '../../../../common/constants/cloud_connector';

import type {
  CloudConnector,
  CloudConnectorListOptions,
  CloudProvider,
  AccountType,
} from '../../../types';
import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';
import type {
  CloudConnectorUsageItem,
  CloudConnectorUsageResponse,
} from './use_cloud_connector_usage';

export interface CloudConnectorQueryFilterOptions {
  cloudProvider?: CloudProvider;
  accountType?: AccountType;
  /** Package name of the current integration (e.g. 'cloud_security_posture') */
  packageName?: string;
  /** Policy template of the current integration (e.g. 'cspm', 'asset_inventory') */
  policyTemplate?: string;
}

const fetchCloudConnectors = async (
  http: HttpStart,
  options?: CloudConnectorListOptions
): Promise<CloudConnector[]> => {
  const query: Record<string, string> = {};

  if (options?.page !== undefined) {
    query.page = options.page.toString();
  }

  if (options?.perPage !== undefined) {
    query.perPage = options.perPage.toString();
  }

  if (options?.kuery) {
    query.kuery = options.kuery;
  }

  return http
    .get<{ items: CloudConnector[] }>(CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN, {
      query,
    })
    .then((res: { items: CloudConnector[] }) => res.items);
};

const fetchCloudConnectorUsage = async (
  http: HttpStart,
  cloudConnectorId: string
): Promise<CloudConnectorUsageResponse> => {
  const path = CLOUD_CONNECTOR_API_ROUTES.USAGE_PATTERN.replace(
    '{cloudConnectorId}',
    cloudConnectorId
  );
  return http.get<CloudConnectorUsageResponse>(path, {
    query: { page: 1, perPage: 1000 },
  });
};

/**
 * Returns the set of package names that belong to the same policy group.
 */
function getCompatiblePackageNames(group: PolicyGroup): Set<string> {
  const entries = CLOUD_CONNECTOR_PERMISSION_ALLOWLIST[group] ?? [];
  return new Set(entries.map((e) => e.package));
}

/**
 * Checks whether a connector's linked package policies are all within the given policy group.
 * Connectors with no linked policies are considered compatible (they can be adopted by anyone).
 */
function isConnectorCompatibleWithGroup(
  usageItems: CloudConnectorUsageItem[],
  compatiblePackages: Set<string>
): boolean {
  if (usageItems.length === 0) return true;
  return usageItems.every(
    (item) => item.package?.name && compatiblePackages.has(item.package.name)
  );
}

export const useGetCloudConnectors = (filterOptions?: CloudConnectorQueryFilterOptions) => {
  const CLOUD_CONNECTOR_QUERY_KEY = 'get-cloud-connectors';
  const { http } = useKibana<CoreStart>().services;

  const { packageName, policyTemplate, ...kqlFilterOptions } = filterOptions ?? {};

  // Construct KQL query from filter options (only cloudProvider and accountType)
  const kuery =
    Object.keys(kqlFilterOptions).length > 0
      ? Object.entries(kqlFilterOptions)
          .map(([key, value]) =>
            value ? `${CLOUD_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.${key}: "${value}"` : null
          )
          .filter(Boolean)
          .join(' AND ')
      : undefined;

  // Determine the current integration's policy group
  const currentPolicyGroup =
    packageName && policyTemplate
      ? getPolicyGroupForIntegration(packageName, policyTemplate)
      : undefined;

  return useQuery(
    [
      CLOUD_CONNECTOR_QUERY_KEY,
      filterOptions?.cloudProvider,
      filterOptions?.accountType,
      packageName,
      policyTemplate,
    ],
    async () => {
      const connectors = await fetchCloudConnectors(http, { kuery });

      // If no policy group context, return all connectors (no filtering)
      if (!currentPolicyGroup) {
        return connectors;
      }

      const compatiblePackages = getCompatiblePackageNames(currentPolicyGroup);

      // For connectors with no linked policies, they're available to any group.
      // For connectors with linked policies, check that all belong to the same group.
      // Results are keyed by connector ID to avoid fragile index-based mapping.
      const usageResultMap = new Map<string, { connector: CloudConnector; compatible: boolean }>();

      await Promise.allSettled(
        connectors.map(async (connector) => {
          if (!connector.packagePolicyCount || connector.packagePolicyCount === 0) {
            usageResultMap.set(connector.id, { connector, compatible: true });
            return;
          }

          try {
            const usage = await fetchCloudConnectorUsage(http, connector.id);
            usageResultMap.set(connector.id, {
              connector,
              compatible: isConnectorCompatibleWithGroup(usage.items, compatiblePackages),
            });
          } catch {
            // On transient errors, treat the connector as compatible so it isn't silently hidden
            usageResultMap.set(connector.id, { connector, compatible: true });
          }
        })
      );

      return connectors
        .map((connector) => usageResultMap.get(connector.id))
        .filter((entry): entry is { connector: CloudConnector; compatible: boolean } =>
          Boolean(entry?.compatible)
        )
        .map(({ connector }) => connector);
    },
    {
      enabled: true,
    }
  );
};
