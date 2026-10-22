/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityGetRoleResponse,
  SecurityGetRoleRole,
} from '@elastic/elasticsearch/lib/api/types';

import type { ElasticsearchRoleDescriptor } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { EXPECTED_BUILTIN_ROLES_WITH_KIBANA_ACCESS } from '../fixtures/expected_builtin_roles_kibana_access';

/**
 * Extracts Kibana-related applications from a role's applications array.
 * Kibana applications are identified by the "kibana-" prefix.
 */
function extractKibanaApplications(
  applications: Array<{ application: string; privileges: string[]; resources: string[] }>
): SecurityGetRoleRole['applications'] {
  return applications
    .filter((app) => app.application.startsWith('kibana-') || app.application === '*')
    .map((app) => ({
      application: app.application,
      privileges: [...app.privileges].sort(),
      resources: [...app.resources].sort(),
    }))
    .sort((a, b) => {
      // Sort by application name, then by resources
      const appCompare = a.application.localeCompare(b.application);
      if (appCompare !== 0) return appCompare;
      return a.resources.join(',').localeCompare(b.resources.join(','));
    });
}

/**
 * Builds a map of built-in role names to their Kibana access configuration.
 * Only includes roles that have Kibana access (non-empty applications array).
 */
function buildBuiltinRolesKibanaAccessMap(
  rolesResponse: SecurityGetRoleResponse
): Record<string, { applications: ElasticsearchRoleDescriptor['applications'] }> {
  const result: Record<string, { applications: ElasticsearchRoleDescriptor['applications'] }> = {};

  for (const [roleName, role] of Object.entries(rolesResponse)) {
    // Only include built-in (reserved) roles
    if (!role.metadata?._reserved) {
      continue;
    }

    const kibanaApplications = extractKibanaApplications(role.applications);

    // Only include roles that actually have Kibana access
    if (kibanaApplications.length > 0) {
      result[roleName] = {
        applications: kibanaApplications,
      };
    }
  }

  return result;
}

/**
 * Compares two role access maps and returns detailed differences.
 */
function compareRoleAccessMaps(
  actual: Record<string, { applications: ElasticsearchRoleDescriptor['applications'] }>,
  expected: Record<string, { applications: ElasticsearchRoleDescriptor['applications'] }>
): {
  addedRoles: string[];
  removedRoles: string[];
  changedRoles: Array<{
    roleName: string;
    actual: { applications: ElasticsearchRoleDescriptor['applications'] };
    expected: { applications: ElasticsearchRoleDescriptor['applications'] };
  }>;
} {
  const actualRoleNames = new Set(Object.keys(actual));
  const expectedRoleNames = new Set(Object.keys(expected));

  const addedRoles = [...actualRoleNames].filter((name) => !expectedRoleNames.has(name)).sort();
  const removedRoles = [...expectedRoleNames].filter((name) => !actualRoleNames.has(name)).sort();

  const changedRoles: Array<{
    roleName: string;
    actual: { applications: ElasticsearchRoleDescriptor['applications'] };
    expected: { applications: ElasticsearchRoleDescriptor['applications'] };
  }> = [];

  // Check for roles that exist in both but have different access
  for (const roleName of actualRoleNames) {
    if (!expectedRoleNames.has(roleName)) continue;

    const actualAccess = actual[roleName];
    const expectedAccess = expected[roleName];

    // Deep compare the applications arrays
    const actualJson = JSON.stringify(actualAccess);
    const expectedJson = JSON.stringify(expectedAccess);

    if (actualJson !== expectedJson) {
      changedRoles.push({
        roleName,
        actual: actualAccess,
        expected: expectedAccess,
      });
    }
  }

  changedRoles.sort((a, b) => a.roleName.localeCompare(b.roleName));

  return { addedRoles, removedRoles, changedRoles };
}

apiTest.describe('Built-in roles Kibana access validation', { tag: tags.stateful.classic }, () => {
  apiTest(
    'should have expected Kibana access for all built-in roles',
    async ({ esClient, log }) => {
      // Fetch all roles from Elasticsearch
      log.info('Fetching all roles from Elasticsearch...');
      const rolesResponse = await esClient.security.getRole();

      // Build the map of built-in roles with Kibana access
      const actualBuiltinRolesWithKibanaAccess = buildBuiltinRolesKibanaAccessMap(rolesResponse);

      log.info(
        `Found ${
          Object.keys(actualBuiltinRolesWithKibanaAccess).length
        } built-in roles with Kibana access`
      );

      // Compare with expected roles
      const differences = compareRoleAccessMaps(
        actualBuiltinRolesWithKibanaAccess,
        EXPECTED_BUILTIN_ROLES_WITH_KIBANA_ACCESS
      );

      expect(differences).toStrictEqual({
        addedRoles: [],
        removedRoles: [],
        changedRoles: [],
      });
    }
  );

  apiTest('should have consistent Kibana application naming', async ({ esClient, log }) => {
    // Fetch all roles from Elasticsearch
    const rolesResponse = await esClient.security.getRole();

    // Collect all unique Kibana application names from built-in roles
    const kibanaAppNames = new Set<string>();

    for (const [_, role] of Object.entries(rolesResponse)) {
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!role.metadata?._reserved) continue;

      for (const app of role.applications) {
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (app.application.startsWith('kibana')) {
          kibanaAppNames.add(app.application);
        }
      }
    }

    log.info(`Found Kibana application names in built-in roles: ${[...kibanaAppNames].join(', ')}`);

    // Verify we only see expected Kibana application patterns
    // The main Kibana application should be "kibana-.kibana" or "kibana-*"
    for (const appName of kibanaAppNames) {
      expect(appName).toMatch(/^kibana-(?:\.kibana|\*)$/);
    }
  });
});
