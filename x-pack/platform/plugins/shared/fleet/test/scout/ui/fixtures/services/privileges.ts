/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Role definition for a user with All privilege for Fleet (fleetv2) but None for integrations (fleet).
 * This role grants:
 * - Fleet v2: all privileges
 * - Fleet (legacy, includes integrations): none privileges
 * - Elasticsearch: all indices, manage_service_account cluster privilege
 */
export const getFleetAllIntegrationsNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['all'],
        fleet: ['none'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user with Fleet Agents Read privilege but None for integrations (fleet).
 * This role grants:
 * - Fleet v2: minimal_read, agents_read privileges
 * - Fleet (legacy, includes integrations): none privileges
 * - Elasticsearch: all indices, manage_service_account cluster privilege
 */
export const getFleetAgentsReadIntegrationsNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['minimal_read', 'agents_read'],
        fleet: ['none'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user with None privilege for Fleet (fleetv2) but All for integrations (fleet).
 * This role grants:
 * - Fleet v2: none privileges
 * - Fleet (legacy, includes integrations): all privileges
 * - Elasticsearch: all indices, manage_service_account cluster privilege
 */
export const getFleetNoneIntegrationsAllRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['none'],
        fleet: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user with All privilege for Fleet (fleetv2) but Read for integrations (fleet).
 * This role grants:
 * - Fleet v2: all privileges
 * - Fleet (legacy, includes integrations): read privileges
 * - Elasticsearch: all indices, manage_service_account cluster privilege
 */
export const getFleetAllIntegrationsReadRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['all'],
        fleet: ['read'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for automatic import with configurable fleet and integrations permissions.
 * @param fleetRole - Permission level for fleetv2 (e.g., 'read', 'all')
 * @param integrationsRole - Permission level for fleet/integrations (e.g., 'read', 'all')
 */
export const getAutomaticImportRole = (
  fleetRole: string,
  integrationsRole: string
): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: [fleetRole],
        fleet: [integrationsRole],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for automatic import with All integrations but None actions permissions.
 */
export const getAutomaticImportConnectorNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
        actions: ['none'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for automatic import with All integrations but Read actions permissions.
 */
export const getAutomaticImportConnectorReadRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
        actions: ['read'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for automatic import with All integrations and All actions permissions.
 */
export const getAutomaticImportConnectorAllRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['manage_service_account'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
});
