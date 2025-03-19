/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/common';

import type { RolePayloadSchemaType } from '../model/put_payload';

export const roleGrantsSubFeaturePrivileges = (
  features: KibanaFeature[],
  role: RolePayloadSchemaType
) => {
  if (!role.kibana) {
    return false;
  }

  const subFeaturePrivileges = new Map(
    features.map((feature) => [
      feature.id,
      feature.subFeatures.map((sf) => sf.privilegeGroups.map((pg) => pg.privileges)).flat(2),
    ])
  );

  const hasAnySubFeaturePrivileges = role.kibana.some((kibanaPrivilege) =>
    Object.entries(kibanaPrivilege.feature ?? {}).some(([featureId, privileges]) => {
      return !!subFeaturePrivileges.get(featureId)?.some(({ id }) => privileges.includes(id));
    })
  );

  return hasAnySubFeaturePrivileges;
};
