/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import type {
  AllRequiredCondition,
  AnyRequiredCondition,
  AuthzDisabled,
  AuthzEnabled,
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  Privilege,
  PrivilegeSet,
  RouteAuthz,
} from '@kbn/core/server';
import { unwindNestedSecurityPrivileges } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type {
  AuthorizationServiceSetup,
  EsSecurityConfig,
} from '@kbn/security-plugin-types-server';
import type { RecursiveReadonly } from '@kbn/utility-types';

import { API_OPERATION_PREFIX, SUPERUSER_PRIVILEGES } from '../../common/constants';

const isAuthzDisabled = (authz?: RecursiveReadonly<RouteAuthz>): authz is AuthzDisabled => {
  return (authz as AuthzDisabled)?.enabled === false;
};

const isReservedPrivilegeSet = (privilege: string): privilege is ReservedPrivilegesSet => {
  return Object.hasOwn(ReservedPrivilegesSet, privilege);
};

interface InitApiAuthorization extends AuthorizationServiceSetup {
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getSecurityConfig: () => Promise<EsSecurityConfig>;
}

export function initAPIAuthorization(
  http: HttpServiceSetup,
  {
    actions,
    checkPrivilegesDynamicallyWithRequest,
    checkPrivilegesWithRequest,
    mode,
    getCurrentUser,
    getSecurityConfig,
  }: InitApiAuthorization,
  logger: Logger
) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    // if we aren't using RBAC for this request, just continue
    if (!mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const security = request.route.options.security!;

    if (isAuthzDisabled(security.authz)) {
      return toolkit.next();
    }

    const authz = security.authz as AuthzEnabled;
    const normalizeRequiredPrivileges = async (privileges: AuthzEnabled['requiredPrivileges']) => {
      const hasOperatorPrivileges = privileges.some(
        (privilege) =>
          privilege === ReservedPrivilegesSet.operator ||
          (typeof privilege === 'object' &&
            privilege.allRequired?.includes(ReservedPrivilegesSet.operator))
      );

      // nothing to normalize
      if (!hasOperatorPrivileges) {
        return privileges;
      }

      const securityConfig = await getSecurityConfig();

      // nothing to normalize
      if (securityConfig.operator_privileges.enabled) {
        return privileges;
      }

      return privileges.reduce<AuthzEnabled['requiredPrivileges']>((acc, privilege) => {
        if (typeof privilege === 'object') {
          const operatorPrivilegeIndex =
            privilege.allRequired?.findIndex((p) => p === ReservedPrivilegesSet.operator) ?? -1;

          acc.push(
            operatorPrivilegeIndex !== -1
              ? {
                  ...privilege,
                  // @ts-ignore wrong types for `toSpliced`
                  allRequired: privilege.allRequired?.toSpliced(operatorPrivilegeIndex, 1),
                }
              : privilege
          );
        } else if (privilege !== ReservedPrivilegesSet.operator) {
          acc.push(privilege);
        }

        return acc;
      }, []);
    };

    // We need to normalize privileges to drop unintended privilege checks.
    // Operator privileges check should be only performed if the `operator_privileges` are enabled in config.
    const requiredPrivileges = await normalizeRequiredPrivileges(authz.requiredPrivileges);

    const { requestedPrivileges, requestedReservedPrivileges } = requiredPrivileges.reduce(
      (acc, privilegeEntry) => {
        const privileges =
          typeof privilegeEntry === 'object'
            ? [
                ...unwindNestedSecurityPrivileges<AllRequiredCondition>(
                  privilegeEntry.allRequired ?? []
                ),
                ...unwindNestedSecurityPrivileges<AnyRequiredCondition>(
                  privilegeEntry.anyRequired ?? []
                ),
              ]
            : [privilegeEntry];

        for (const privilege of privileges) {
          if (isReservedPrivilegeSet(privilege)) {
            acc.requestedReservedPrivileges.push(privilege);
          } else {
            acc.requestedPrivileges.push(privilege);
          }
        }

        return acc;
      },
      {
        requestedPrivileges: [] as string[],
        requestedReservedPrivileges: [] as string[],
      }
    );

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const privilegeToApiOperation = (privilege: string) =>
      privilege.replace(API_OPERATION_PREFIX, '');

    const kibanaPrivileges: Record<string, boolean> = {};

    if (requestedPrivileges.length > 0) {
      const checkPrivilegesResponse = await checkPrivileges({
        kibana: requestedPrivileges.map((permission) => actions.api.get(permission)),
      });

      for (const kbPrivilege of checkPrivilegesResponse.privileges.kibana) {
        kibanaPrivileges[privilegeToApiOperation(kbPrivilege.privilege)] = kbPrivilege.authorized;
      }
    }

    for (const reservedPrivilege of requestedReservedPrivileges) {
      if (reservedPrivilege === ReservedPrivilegesSet.superuser) {
        const checkSuperuserPrivilegesResponse = await checkPrivilegesWithRequest(request).globally(
          SUPERUSER_PRIVILEGES
        );
        kibanaPrivileges[ReservedPrivilegesSet.superuser] =
          checkSuperuserPrivilegesResponse.hasAllRequested;
      }

      if (reservedPrivilege === ReservedPrivilegesSet.operator) {
        const currentUser = getCurrentUser(request);

        kibanaPrivileges[ReservedPrivilegesSet.operator] = currentUser?.operator ?? false;
      }
    }

    const hasRequestedPrivilege = (kbPrivilege: Privilege | PrivilegeSet) => {
      if (typeof kbPrivilege === 'object') {
        const allRequired = kbPrivilege.allRequired ?? [];
        const anyRequired = kbPrivilege.anyRequired ?? [];

        return (
          allRequired.every((privilege) =>
            typeof privilege === 'string'
              ? kibanaPrivileges[privilege]
              : // checking composite privileges
                privilege.anyOf.some(
                  (anyPrivilegeEntry: Privilege) => kibanaPrivileges[anyPrivilegeEntry]
                )
          ) &&
          (!anyRequired.length ||
            anyRequired.some((privilege) =>
              typeof privilege === 'string'
                ? kibanaPrivileges[privilege]
                : // checking composite privileges
                  privilege.allOf.every(
                    (allPrivilegeEntry: Privilege) => kibanaPrivileges[allPrivilegeEntry]
                  )
            ))
        );
      }

      return kibanaPrivileges[kbPrivilege];
    };

    for (const privilege of requiredPrivileges) {
      if (!hasRequestedPrivilege(privilege)) {
        const missingPrivileges = Object.keys(kibanaPrivileges).filter(
          (key) => !kibanaPrivileges[key]
        );
        const forbiddenMessage = `API [${request.route.method.toUpperCase()} ${
          request.url.pathname
        }${
          request.url.search
        }] is unauthorized for user, this action is granted by the Kibana privileges [${missingPrivileges}]`;

        logger.warn(forbiddenMessage);

        return response.forbidden({
          body: {
            message: forbiddenMessage,
          },
        });
      }
    }

    return toolkit.authzResultNext(kibanaPrivileges);
  });
}
