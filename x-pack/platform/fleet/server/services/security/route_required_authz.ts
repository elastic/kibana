/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

import type { RouteMethod } from '@kbn/core-http-server';

import { PACKAGE_POLICY_API_ROUTES, AGENT_API_ROUTES } from '../../../common';

import { EPM_API_ROUTES } from '../../constants';

import type { FleetRouteRequiredAuthz } from './types';

/**
 * The authorization requirements needed for an API route. Route authorization requirements are
 * defined either via an `all` object, where all values must be `true` in order for access to be granted,
 * or, by an `any` object, where any value defined that is set to `true` will grant access to the API.
 *
 * The `all` conditions are checked first and if those evaluate to `false`, then `any` conditions are evaluated.
 */
const ROUTE_AUTHZ_REQUIREMENTS = deepFreeze<Record<string, FleetRouteRequiredAuthz>>({
  // Package Policy Update API
  [`put:${PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN}`]: {
    any: {
      integrations: { writeIntegrationPolicies: true },
      packagePrivileges: {
        endpoint: {
          actions: {
            writePolicyManagement: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy GET one API
  [`get:${PACKAGE_POLICY_API_ROUTES.INFO_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy Bulk GET API
  [`post:${PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy List API
  [`get:${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // agent status fo policy API
  [`get:${AGENT_API_ROUTES.STATUS_PATTERN}`]: {
    any: {
      fleet: {
        readAgents: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // EPM Package Info API
  [`get:${EPM_API_ROUTES.INFO_PATTERN}`]: {
    any: {
      integrations: {
        readPackageInfo: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readSecuritySolution: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },
  [`get:${EPM_API_ROUTES.INFO_PATTERN_DEPRECATED}`]: {
    any: {
      integrations: {
        readPackageInfo: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readSecuritySolution: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },
});

/**
 * Retrieves the required fleet route authz
 * in order to grant access to the given api route
 * @param routeMethod
 * @param routePath
 */
export const getRouteRequiredAuthz = (
  routeMethod: RouteMethod,
  routePath: string
): FleetRouteRequiredAuthz | undefined => {
  const key = `${routeMethod}:${routePath}`;

  if (typeof ROUTE_AUTHZ_REQUIREMENTS[key] !== 'undefined') {
    return ROUTE_AUTHZ_REQUIREMENTS[key];
  }

  for (const k of Object.keys(ROUTE_AUTHZ_REQUIREMENTS)) {
    if (pathMatchesPattern(k, key)) {
      return ROUTE_AUTHZ_REQUIREMENTS[k];
    }
  }
};

const pathMatchesPattern = (pathPattern: string, path: string): boolean => {
  // No path params - pattern is single path
  if (pathPattern === path) {
    return true;
  }

  // If pathPattern has params (`{value}`), then see if `path` matches it
  if (/{.*?}/.test(pathPattern)) {
    const pathParts = path.split(/\//);
    const patternParts = pathPattern.split(/\//);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    return pathParts.every((part, index) => {
      return part === patternParts[index] || /{.*?}/.test(patternParts[index]);
    });
  }

  return false;
};
