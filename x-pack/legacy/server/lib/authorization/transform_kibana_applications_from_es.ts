/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
  GLOBAL_RESOURCE,
} from '../../../common/constants';
import { PrivilegeSerializer, ResourceSerializer } from '.';
import { EsApplication, TransformApplicationsFromEsResponse } from './types';

export const transformKibanaApplicationsFromEs = (
  application: string,
  esApplications: EsApplication[]
): TransformApplicationsFromEsResponse => {
  const kibanaApplications = esApplications.filter(
    roleApplication =>
      roleApplication.application === application ||
      roleApplication.application === RESERVED_PRIVILEGES_APPLICATION_WILDCARD
  );

  // if any application entry contains an empty resource, we throw an error
  if (kibanaApplications.some(entry => entry.resources.length === 0)) {
    throw new Error(`ES returned an application entry without resources, can't process this`);
  }

  // if there is an entry with the reserved privileges application wildcard
  // and there are privileges which aren't reserved, we won't transform these
  if (
    kibanaApplications.some(
      entry =>
        entry.application === RESERVED_PRIVILEGES_APPLICATION_WILDCARD &&
        !entry.privileges.every(privilege =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if space privilege assigned globally, we can't transform these
  if (
    kibanaApplications.some(
      entry =>
        entry.resources.includes(GLOBAL_RESOURCE) &&
        entry.privileges.some(privilege =>
          PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if global base or reserved privilege assigned at a space, we can't transform these
  if (
    kibanaApplications.some(
      entry =>
        !entry.resources.includes(GLOBAL_RESOURCE) &&
        entry.privileges.some(
          privilege =>
            PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege) ||
            PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if reserved privilege assigned with feature or base privileges, we won't transform these
  if (
    kibanaApplications.some(
      entry =>
        entry.privileges.some(privilege =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        ) &&
        entry.privileges.some(
          privilege => !PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if base privilege assigned with feature privileges, we won't transform these
  if (
    kibanaApplications.some(
      entry =>
        entry.privileges.some(privilege =>
          PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
        ) &&
        (entry.privileges.some(privilege =>
          PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)
        ) ||
          entry.privileges.some(privilege =>
            PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
          ))
    )
  ) {
    return {
      success: false,
    };
  }

  // if any application entry contains the '*' resource in addition to another resource, we can't transform these
  if (
    kibanaApplications.some(
      entry => entry.resources.includes(GLOBAL_RESOURCE) && entry.resources.length > 1
    )
  ) {
    return {
      success: false,
    };
  }

  const allResources = _.flatten(kibanaApplications.map(entry => entry.resources));
  // if we have improperly formatted resource entries, we can't transform these
  if (
    allResources.some(
      resource =>
        resource !== GLOBAL_RESOURCE && !ResourceSerializer.isSerializedSpaceResource(resource)
    )
  ) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    value: kibanaApplications.map(({ resources, privileges }) => {
      // if we're dealing with a global entry, which we've ensured above is only possible if it's the only item in the array
      if (resources.length === 1 && resources[0] === GLOBAL_RESOURCE) {
        const reservedPrivileges = privileges.filter(privilege =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        );
        const basePrivileges = privileges.filter(privilege =>
          PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)
        );
        const featurePrivileges = privileges.filter(privilege =>
          PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
        );

        return {
          ...(reservedPrivileges.length
            ? {
                _reserved: reservedPrivileges.map(privilege =>
                  PrivilegeSerializer.deserializeReservedPrivilege(privilege)
                ),
              }
            : {}),
          base: basePrivileges.map(privilege =>
            PrivilegeSerializer.serializeGlobalBasePrivilege(privilege)
          ),
          feature: featurePrivileges.reduce(
            (acc, privilege) => {
              const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
              return {
                ...acc,
                [featurePrivilege.featureId]: _.uniq([
                  ...(acc[featurePrivilege.featureId] || []),
                  featurePrivilege.privilege,
                ]),
              };
            },
            {} as Record<string, string[]>
          ),
          spaces: ['*'],
        };
      }

      const basePrivileges = privileges.filter(privilege =>
        PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
      );
      const featurePrivileges = privileges.filter(privilege =>
        PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
      );
      return {
        base: basePrivileges.map(privilege =>
          PrivilegeSerializer.deserializeSpaceBasePrivilege(privilege)
        ),
        feature: featurePrivileges.reduce(
          (acc, privilege) => {
            const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
            return {
              ...acc,
              [featurePrivilege.featureId]: _.uniq([
                ...(acc[featurePrivilege.featureId] || []),
                featurePrivilege.privilege,
              ]),
            };
          },
          {} as Record<string, string[]>
        ),
        spaces: resources.map(resource => ResourceSerializer.deserializeSpaceResource(resource)),
      };
    }),
  };
};
