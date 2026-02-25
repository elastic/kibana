/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import type { KibanaRequest } from '@kbn/core/server';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { TRANSFORM_PLUGIN_ID } from '../../../common/constants/plugin';

import type { FleetAuthz } from '../../../common';
import { INTEGRATIONS_PLUGIN_ID } from '../../../common';
import {
  calculateAuthz,
  calculateEndpointExceptionsPrivilegesFromKibanaPrivileges,
  calculatePackagePrivilegesFromKibanaPrivileges,
  getAuthorizationFromPrivileges,
} from '../../../common/authz';

import { appContextService } from '..';
import {
  ENDPOINT_EXCEPTIONS_PRIVILEGES,
  ENDPOINT_PRIVILEGES,
  PLUGIN_ID,
  type PrivilegeMapObject,
} from '../../constants';

import type {
  FleetAuthzRequirements,
  FleetAuthzRouteConfig,
  FleetRouteRequiredAuthz,
} from './types';

export function checkSecurityEnabled() {
  return appContextService.getSecurityLicense().isEnabled();
}

export function checkSuperuser(req: KibanaRequest) {
  if (!checkSecurityEnabled()) {
    return false;
  }

  const security = appContextService.getSecurityCore();
  const user = security.authc.getCurrentUser(req);

  if (!user) {
    return false;
  }

  const userRoles = user.roles || [];
  if (!userRoles.includes('superuser')) {
    return false;
  }

  return true;
}

const computeUiApiPrivileges = (
  security: SecurityPluginStart,
  privileges: Record<string, PrivilegeMapObject>
): string[] => {
  return Object.entries(privileges).map(
    ([_, { appId, privilegeType, privilegeSplit, privilegeName }]) => {
      if (privilegeType === 'ui') {
        return security.authz.actions[privilegeType].get(`${appId}`, `${privilegeName}`);
      }
      return security.authz.actions[privilegeType].get(`${appId}${privilegeSplit}${privilegeName}`);
    }
  );
};

const FLEET_SUBFEATURES = ['agents', 'agent-policies', 'settings'];

export async function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz> {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const endpointPrivileges = computeUiApiPrivileges(security, ENDPOINT_PRIVILEGES);
    const endpointExceptionsPrivileges = computeUiApiPrivileges(
      security,
      ENDPOINT_EXCEPTIONS_PRIVILEGES
    );

    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get(`${PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${PLUGIN_ID}-read`),
        security.authz.actions.api.get(`${PLUGIN_ID}-setup`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-read`),
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-admin`),
        security.authz.actions.api.get(`${TRANSFORM_PLUGIN_ID}-read`),

        // Fleet subprivileges
        ...FLEET_SUBFEATURES.flatMap((subfeature) => [
          security.authz.actions.api.get(`${PLUGIN_ID}-${subfeature}-all`),
          security.authz.actions.api.get(`${PLUGIN_ID}-${subfeature}-read`),
        ]),

        ...endpointPrivileges,
        ...endpointExceptionsPrivileges,
      ],
    });

    const fleetAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-all`,
    });
    const fleetReadAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-read`,
    });
    const intAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${INTEGRATIONS_PLUGIN_ID}-all`,
    });
    const intReadAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${INTEGRATIONS_PLUGIN_ID}-read`,
    });
    const fleetSetupAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      searchPrivilege: 'fleet-setup',
    });
    // Fleet sub features
    const fleetAgentsAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-agents-all`,
    });
    const fleetAgentsReadAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-agents-read`,
    });
    const fleetAgentPoliciesAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-agent-policies-all`,
    });
    const fleetAgentPoliciesReadAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-agent-policies-read`,
    });
    const fleetSettingsAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-settings-all`,
    });
    const fleetSettingsReadAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-settings-read`,
    });
    const fleetGenerateReportsAllAuth = getAuthorizationFromPrivileges({
      kibanaPrivileges: privileges.kibana,
      prefix: `${PLUGIN_ID}-generate-report`,
    });

    return {
      ...calculateAuthz({
        fleet: {
          all: fleetAllAuth,
          read: fleetReadAuth,
          setup: fleetSetupAuth,
          agents: {
            read: fleetAgentsReadAuth,
            all: fleetAgentsAllAuth,
          },
          agentPolicies: {
            read: fleetAgentPoliciesReadAuth,
            all: fleetAgentPoliciesAllAuth,
          },
          settings: {
            read: fleetSettingsReadAuth,
            all: fleetSettingsAllAuth,
          },
          generateReports: {
            all: fleetGenerateReportsAllAuth,
          },
        },
        integrations: {
          all: intAllAuth,
          read: intReadAuth,
        },
      }),
      packagePrivileges: calculatePackagePrivilegesFromKibanaPrivileges(privileges.kibana),
      endpointExceptionsPrivileges: calculateEndpointExceptionsPrivilegesFromKibanaPrivileges(
        privileges.kibana
      ),
    };
  }

  return calculateAuthz({
    fleet: { all: false, read: false, setup: false },
    integrations: {
      all: false,
      read: false,
    },
  });
}

interface RouteAuthz {
  /** Is route access granted (based on authz) */
  granted: boolean;

  /** Was authorization to the api a result of Fleet (and Integrations) Privileges (as oposed to Package privileges) */
  grantedByFleetPrivileges: boolean;

  /**
   * Set when `grantedByFleetPrivileges` is `false` and `granted` is true, which indicate access was granted
   * via a Package Privileges. Array will hold the list of Package names that are allowed
   */
  scopeDataToPackages: string[] | undefined;
}

/**
 * Calculates Authz information for a Route, including:
 * 1. Is access granted
 * 2. was access granted based on Fleet and/or Integration privileges, and
 * 3. a list of package names for which access was granted (only set if access was granted by package privileges)
 *
 * @param fleetAuthz
 * @param requiredAuthz
 */
export const calculateRouteAuthz = (
  fleetAuthz: FleetAuthz,
  requiredAuthz: FleetRouteRequiredAuthz | undefined
): RouteAuthz => {
  const response: RouteAuthz = {
    granted: false,
    grantedByFleetPrivileges: false,
    scopeDataToPackages: undefined,
  };
  const fleetAuthzFlatten = flatten(fleetAuthz);

  const isPrivilegeGranted = (flattenPrivilegeKey: string): boolean =>
    fleetAuthzFlatten[flattenPrivilegeKey] === true;

  if (typeof requiredAuthz === 'undefined') {
    return response;
  }

  if (requiredAuthz.all) {
    response.granted = Object.keys(flatten(requiredAuthz.all)).every(isPrivilegeGranted);

    if (response.granted) {
      if (requiredAuthz.all.fleet || requiredAuthz.all.integrations) {
        response.grantedByFleetPrivileges = true;
      }

      return response;
    }
  }

  if (requiredAuthz.any) {
    response.granted = Object.keys(flatten(requiredAuthz.any)).some(isPrivilegeGranted);

    if (response.granted) {
      // Figure out if authz was granted via Fleet privileges
      if (requiredAuthz.any.fleet || requiredAuthz.any.integrations) {
        const fleetAnyPrivileges = pick(requiredAuthz.any, ['fleet', 'integrations']);

        response.grantedByFleetPrivileges = Object.keys(flatten(fleetAnyPrivileges)).some(
          isPrivilegeGranted
        );
      }

      // If access was NOT granted via Fleet Authz, then retrieve a list of Package names that were
      // granted access to their respective data.
      if (!response.grantedByFleetPrivileges && requiredAuthz.any.packagePrivileges) {
        for (const [packageName, packageRequiredAuthz] of Object.entries(
          requiredAuthz.any.packagePrivileges
        )) {
          const packageRequiredAuthzKeys = Object.keys(
            flatten({ packagePrivileges: { [packageName]: packageRequiredAuthz } })
          );

          if (packageRequiredAuthzKeys.some(isPrivilegeGranted)) {
            if (!response.scopeDataToPackages) {
              response.scopeDataToPackages = [];
            }

            response.scopeDataToPackages.push(packageName);
          }
        }
      }

      return response;
    }
  }

  return response;
};

/**
 * Utility to flatten an object's key all the way down to the last value.
 * @param source
 */
function flatten(source: FleetAuthzRequirements | FleetAuthz): Record<string, boolean> {
  const response: Record<string, boolean> = {};
  const processKeys = (prefix: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      const objectKeys = Object.keys(value);

      for (const key of objectKeys) {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, (value as Record<string, boolean>)[key]);
      }
    } else if (Array.isArray(value)) {
      value.forEach((subValue, key) => {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, subValue);
      });
    } else {
      response[prefix] = value as boolean;
    }
  };

  processKeys('', source);

  return response;
}

/**
 * Utility to determine if a user has the required Fleet Authz based on user privileges
 * and route required authz structure.
 * @param authz
 * @param fleetRequiredAuthz
 * @returns boolean
 */
export const doesNotHaveRequiredFleetAuthz = (
  authz: FleetAuthz,
  fleetRequiredAuthz: FleetAuthzRouteConfig['fleetAuthz']
): boolean => {
  return (
    !!fleetRequiredAuthz &&
    ((typeof fleetRequiredAuthz === 'function' && !fleetRequiredAuthz(authz)) ||
      (typeof fleetRequiredAuthz !== 'function' &&
        !calculateRouteAuthz(authz, { all: fleetRequiredAuthz }).granted))
  );
};
