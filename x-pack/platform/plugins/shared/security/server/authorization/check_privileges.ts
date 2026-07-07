/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { pick, transform, uniq } from 'lodash';

import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type {
  CheckPrivileges,
  CheckPrivilegesOptions,
  CheckPrivilegesPayload,
  CheckPrivilegesResponse,
  CheckUserProfilesPrivileges,
  CheckUserProfilesPrivilegesPayload,
  CheckUserProfilesPrivilegesResponse,
  HasPrivilegesResponseApplication,
} from '@kbn/security-plugin-types-server';
import { GLOBAL_RESOURCE } from '@kbn/security-plugin-types-server';

import { ResourceSerializer } from './resource_serializer';
import { validateEsPrivilegeResponse } from './validate_es_response';

interface CheckPrivilegesActions {
  login: string;
}

export function checkPrivilegesFactory(
  actions: CheckPrivilegesActions,
  getClusterClient: () => Promise<IClusterClient>,
  applicationName: string
) {
  const createApplicationPrivilegesCheck = (
    resources: string[],
    kibanaPrivileges: string | string[],
    { requireLoginAction }: CheckPrivilegesOptions
  ) => {
    const normalizedKibanaPrivileges = Array.isArray(kibanaPrivileges)
      ? kibanaPrivileges
      : [kibanaPrivileges];

    return {
      application: applicationName,
      resources,
      privileges: uniq([
        ...(requireLoginAction ? [actions.login] : []),
        ...normalizedKibanaPrivileges,
      ]),
    };
  };

  function checkUserProfilesPrivileges(userProfileUids: Set<string>): CheckUserProfilesPrivileges {
    const checkPrivilegesAtResources = async (
      resources: string[],
      privileges: CheckUserProfilesPrivilegesPayload
    ): Promise<CheckUserProfilesPrivilegesResponse> => {
      const clusterClient = await getClusterClient();

      const applicationPrivilegesCheck = createApplicationPrivilegesCheck(
        resources,
        privileges.kibana,
        { requireLoginAction: true }
      );

      const response = await clusterClient.asInternalUser.transport.request<{
        has_privilege_uids: string[];
        errors: {
          count: number;
          details: Record<string, { type: string; reason: string }>;
        };
      }>({
        method: 'POST',
        path: '_security/profile/_has_privileges',
        body: {
          uids: [...userProfileUids],
          privileges: { application: [applicationPrivilegesCheck] },
        },
      });

      return {
        hasPrivilegeUids: response.has_privilege_uids,
        ...(response.errors && { errors: response.errors }),
      };
    };

    return {
      async atSpace(spaceId: string, privileges: CheckUserProfilesPrivilegesPayload) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResources([spaceResource], privileges);
      },
    };
  }

  function checkPrivilegesWithRequest(request: KibanaRequest): CheckPrivileges {
    const checkPrivilegesAtResources = async (
      resources: string[],
      privileges: CheckPrivilegesPayload,
      { requireLoginAction = true }: CheckPrivilegesOptions = {}
    ): Promise<CheckPrivilegesResponse> => {
      const applicationPrivilegesCheck = createApplicationPrivilegesCheck(
        resources,
        privileges.kibana ?? [],
        { requireLoginAction }
      );

      const clusterClient = (await getClusterClient()).asScoped(request);
      const hasPrivilegesResponse = await clusterClient.asCurrentUser.security.hasPrivileges({
        cluster: privileges.elasticsearch?.cluster as estypes.SecurityClusterPrivilege[],
        index: Object.entries(privileges.elasticsearch?.index ?? {}).map(
          ([name, indexPrivileges]) => ({
            names: [name],
            privileges: indexPrivileges as estypes.SecurityIndexPrivilege[],
          })
        ),
        application: [applicationPrivilegesCheck],
      });

      validateEsPrivilegeResponse(
        hasPrivilegesResponse,
        applicationName,
        applicationPrivilegesCheck.privileges,
        resources
      );

      const applicationPrivilegesResponse = hasPrivilegesResponse.application[applicationName];

      const clusterPrivilegesResponse = hasPrivilegesResponse.cluster ?? {};

      const clusterPrivileges = Object.entries(clusterPrivilegesResponse).map(
        ([privilege, authorized]) => ({
          privilege,
          authorized,
        })
      );

      const indexPrivileges = Object.entries(hasPrivilegesResponse.index ?? {}).reduce<
        CheckPrivilegesResponse['privileges']['elasticsearch']['index']
      >((acc, [index, indexResponse]) => {
        acc[index] = Object.entries(indexResponse).map(([privilege, authorized]) => ({
          privilege,
          authorized,
        }));
        return acc;
      }, {});

      // we need to filter out the non requested privileges from the response
      const resourcePrivileges = transform(applicationPrivilegesResponse, (result, value, key) => {
        result[key!] = pick(value, privileges.kibana ?? []);
      }) as HasPrivilegesResponseApplication;
      const privilegeArray = Object.entries(resourcePrivileges)
        .map(([key, val]) => {
          // we need to turn the resource responses back into the space ids
          const resource =
            key !== GLOBAL_RESOURCE ? ResourceSerializer.deserializeSpaceResource(key!) : undefined;
          return Object.entries(val).map(([privilege, authorized]) => ({
            resource,
            privilege,
            authorized,
          }));
        })
        .flat();

      return {
        hasAllRequested: hasPrivilegesResponse.has_all_requested,
        username: hasPrivilegesResponse.username,
        privileges: {
          kibana: privilegeArray,
          elasticsearch: {
            cluster: clusterPrivileges,
            index: indexPrivileges,
          },
        },
      };
    };

    return {
      async atSpace(
        spaceId: string,
        privileges: CheckPrivilegesPayload,
        options?: CheckPrivilegesOptions
      ) {
        const spaceResource = ResourceSerializer.serializeSpaceResource(spaceId);
        return await checkPrivilegesAtResources([spaceResource], privileges, options);
      },
      async atSpaces(
        spaceIds: string[],
        privileges: CheckPrivilegesPayload,
        options?: CheckPrivilegesOptions
      ) {
        const spaceResources = spaceIds.map((spaceId) =>
          ResourceSerializer.serializeSpaceResource(spaceId)
        );
        return await checkPrivilegesAtResources(spaceResources, privileges, options);
      },
      async globally(privileges: CheckPrivilegesPayload, options?: CheckPrivilegesOptions) {
        return await checkPrivilegesAtResources([GLOBAL_RESOURCE], privileges, options);
      },
    };
  }

  return { checkPrivilegesWithRequest, checkUserProfilesPrivileges };
}
