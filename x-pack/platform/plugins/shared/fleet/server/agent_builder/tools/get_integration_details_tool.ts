/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import {
  SO_SEARCH_LIMIT,
  type FleetAuthz,
  type PackageListItem,
  type PackagePolicy,
} from '../../../common';
import { installationStatuses } from '../../../common/constants/epm';
import type { PackageService } from '../../services/epm/package_service';
import type { PackagePolicyService } from '../../services/package_policy_service';
import { PLATFORM_FLEET_GET_INTEGRATION_DETAILS_TOOL_ID } from './tool_ids';

const schema = z.object({
  package_names: z
    .array(z.string().min(1).max(256))
    .max(100)
    .optional()
    .describe('Exact Fleet package names to retrieve. Omit to search or list integrations.'),
  search: z
    .string()
    .max(256)
    .optional()
    .describe('Case-insensitive search across package and integration names and titles.'),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

interface IntegrationDetails {
  package_name: string;
  package_title: string;
  integration_name?: string;
  integration_title?: string;
  latest_package_version: string;
  installed_package_version?: string;
  is_installed: boolean;
  is_enabled: boolean;
}

interface ToolDependencies {
  getPackageService: () => PackageService | undefined;
  getPackagePolicyService: () => PackagePolicyService | undefined;
  getAuthz: (request: Parameters<PackageService['asScoped']>[0]) => Promise<FleetAuthz>;
  logger: Logger;
}

const integrationKey = (packageName: string, integrationName = '') =>
  `${packageName}${integrationName}`;

const getEnabledIntegrations = (packagePolicies: PackagePolicy[]): Set<string> => {
  const enabledIntegrations = new Set<string>();

  for (const packagePolicy of packagePolicies) {
    const packageName = packagePolicy.package?.name.trim();
    if (!packageName) {
      continue;
    }

    enabledIntegrations.add(integrationKey(packageName));
    for (const input of packagePolicy.inputs) {
      if (!input.enabled) {
        continue;
      }
      const integrationName = (input.policy_template ?? input.type ?? '').trim();
      enabledIntegrations.add(integrationKey(packageName, integrationName));
    }
  }

  return enabledIntegrations;
};

const flattenPackage = (
  fleetPackage: PackageListItem,
  enabledIntegrations: Set<string>
): IntegrationDetails[] => {
  const packageName = fleetPackage.name;
  const templates = fleetPackage.policy_templates ?? [];
  const common = {
    package_name: packageName,
    package_title: fleetPackage.title,
    latest_package_version: fleetPackage.version,
    installed_package_version: fleetPackage.installationInfo?.version,
    is_installed: fleetPackage.status === installationStatuses.Installed,
  };

  if (templates.length === 0) {
    return [
      {
        ...common,
        is_enabled: enabledIntegrations.has(integrationKey(packageName)),
      },
    ];
  }

  return templates.map((template) => ({
    ...common,
    integration_name: template.name,
    integration_title: template.title,
    is_enabled:
      enabledIntegrations.has(integrationKey(packageName, template.name)) ||
      (templates.length === 1 && enabledIntegrations.has(integrationKey(packageName))),
  }));
};

const matchesSearch = (integration: IntegrationDetails, search: string): boolean => {
  const normalizedSearch = search.toLocaleLowerCase();
  return [
    integration.package_name,
    integration.package_title,
    integration.integration_name,
    integration.integration_title,
  ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
};

export const getIntegrationDetailsTool = ({
  getPackageService,
  getPackagePolicyService,
  getAuthz,
  logger,
}: ToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: PLATFORM_FLEET_GET_INTEGRATION_DETAILS_TOOL_ID,
  type: ToolType.builtin,
  description: `Get Fleet integration details and live readiness.

Returns package and integration names, titles, latest and installed package versions, package installation status, and integration enablement status. Integration enablement means an enabled input exists in a configured package policy.

Use exact package_names when another tool provides inferred integration package ids. Read-only.`,
  schema,
  tags: ['fleet', 'integrations'],
  handler: async ({ package_names: packageNames, search, page, per_page: perPage }, context) => {
    try {
      const authz = await getAuthz(context.request);
      if (!authz.integrations.readPackageInfo || !authz.integrations.readIntegrationPolicies) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'Fleet Integrations: Read and Agent Policies: Read privileges are required to retrieve integration details and enablement status.',
              },
            },
          ],
        };
      }

      const packageService = getPackageService();
      const packagePolicyService = getPackagePolicyService();
      if (!packageService || !packagePolicyService) {
        throw new Error('Fleet services are not available');
      }

      const [packages, packagePoliciesResult] = await Promise.all([
        packageService.asScoped(context.request).getPackages({ prerelease: true }),
        packagePolicyService.asScoped(context.request).list(context.savedObjectsClient, {
          page: 1,
          perPage: SO_SEARCH_LIMIT,
          spaceId: context.spaceId,
        }),
      ]);

      const requestedPackageNames = packageNames
        ? new Set(packageNames.map((packageName) => packageName.toLocaleLowerCase()))
        : undefined;
      const enabledIntegrations = getEnabledIntegrations(packagePoliciesResult.items);
      const integrations = packages
        .filter(
          (fleetPackage) =>
            !requestedPackageNames ||
            requestedPackageNames.has(fleetPackage.name.toLocaleLowerCase())
        )
        .flatMap((fleetPackage) => flattenPackage(fleetPackage, enabledIntegrations))
        .filter((integration) => !search || matchesSearch(integration, search))
        .sort(
          (left, right) =>
            left.package_name.localeCompare(right.package_name) ||
            (left.integration_name ?? '').localeCompare(right.integration_name ?? '')
        );

      const foundPackageNames = new Set(
        integrations.map((integration) => integration.package_name.toLocaleLowerCase())
      );
      const notFound =
        packageNames?.filter(
          (packageName) => !foundPackageNames.has(packageName.toLocaleLowerCase())
        ) ?? [];
      const start = (page - 1) * perPage;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total: integrations.length,
              page,
              per_page: perPage,
              integrations: integrations.slice(start, start + perPage),
              not_found: notFound,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get Fleet integration details: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to get Fleet integration details: ${message}` },
          },
        ],
      };
    }
  },
});
