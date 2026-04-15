/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRoleDescriptor } from '@kbn/scout';

/**
 * Expected Kibana access configuration for Elasticsearch built-in roles.
 *
 * This file contains the expected Kibana privileges for all built-in (reserved) roles
 * that grant access to Kibana. It is used to detect unexpected changes during the
 * snapshot promotion process.
 *
 * ## Test Failure Scenarios
 *
 * The test will fail if:
 * 1. An existing role grants a different level of Kibana access than expected
 * 2. A new role is introduced which grants Kibana access (not in this list)
 * 3. An existing role which used to grant Kibana access is removed
 *
 * ## What We Test
 *
 * We only validate the Kibana access (applications field) of built-in roles.
 * Changes to the following are NOT tested:
 * - Cluster privileges
 * - Index privileges
 * - Remote index privileges
 * - run_as privileges
 *
 * ## Updating This File
 *
 * If a test failure is expected (e.g., a new built-in role is intentionally added),
 * update this file with the new expected values. The test output will show the
 * current actual values that can be used to update this file.
 *
 * ## Structure
 *
 * Each entry maps a role name to its expected Kibana access:
 * - `applications`: Array of Kibana application privileges
 *   - `application`: The Kibana application identifier (e.g., "kibana-.kibana")
 *   - `privileges`: Array of privilege names (sorted alphabetically)
 *   - `resources`: Array of resource identifiers (sorted alphabetically)
 */

/**
 * Map of built-in role names to their expected Kibana access configuration.
 *
 * Only roles that grant Kibana access are included here. Built-in roles that
 * do not have any Kibana privileges (applications starting with "kibana-")
 * are intentionally excluded.
 *
 * IMPORTANT: This data represents the expected state. If Elasticsearch changes
 * the built-in roles, this file must be updated to reflect those changes.
 */
export const EXPECTED_BUILTIN_ROLES_WITH_KIBANA_ACCESS: Record<
  string,
  { applications: ElasticsearchRoleDescriptor['applications'] }
> = {
  // ==========================================================================
  // Core Kibana Roles
  // ==========================================================================

  /**
   * The superuser role - grants full access to everything
   */
  superuser: {
    applications: [
      {
        application: '*',
        privileges: ['*'],
        resources: ['*'],
      },
    ],
  },

  /**
   * kibana_admin - Full Kibana access
   */
  kibana_admin: {
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['all'],
        resources: ['*'],
      },
    ],
  },

  /**
   * kibana_user - Full Kibana access
   */
  kibana_user: {
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['all'],
        resources: ['*'],
      },
    ],
  },

  /**
   * reporting_user - Access to reserved reporting features
   */
  reporting_user: {
    applications: [
      {
        application: 'kibana-*',
        privileges: ['reserved_reporting_user'],
        resources: ['*'],
      },
    ],
  },

  // ==========================================================================
  // Observability Roles
  // ==========================================================================

  /**
   * monitoring_user - Access to monitoring features
   */
  monitoring_user: {
    applications: [
      {
        application: 'kibana-*',
        privileges: ['reserved_monitoring'],
        resources: ['*'],
      },
    ],
  },

  // ==========================================================================
  // Machine Learning Roles
  // ==========================================================================

  /**
   * machine_learning_admin - Full ML access
   */
  machine_learning_admin: {
    applications: [
      {
        application: 'kibana-*',
        privileges: ['reserved_ml_admin'],
        resources: ['*'],
      },
    ],
  },

  /**
   * machine_learning_user - Read-only ML access
   */
  machine_learning_user: {
    applications: [
      {
        application: 'kibana-*',
        privileges: ['reserved_ml_user'],
        resources: ['*'],
      },
    ],
  },

  // ==========================================================================
  // Additional Roles
  // ==========================================================================

  /**
   * editor - General editor access to Kibana
   */
  editor: {
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['all'],
        resources: ['*'],
      },
    ],
  },

  /**
   * viewer - General read access to Kibana
   */
  viewer: {
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['read'],
        resources: ['*'],
      },
    ],
  },

  // ==========================================================================
  // IMPORTANT: Update Instructions
  // ==========================================================================
  //
  // To update this file with the actual expected values:
  //
  // 1. Run the test with verbose logging:
  //    node scripts/scout.js run-tests \
  //      --stateful \
  //      --config x-pack/platform/plugins/shared/security/test/scout/api/playwright.config.ts
  //
  // 2. The test will output the actual built-in roles with Kibana access
  //
  // 3. Copy the output and replace this object's contents
  //
  // 4. Review the changes to ensure they are expected
  //
  // ==========================================================================
};
