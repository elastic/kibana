/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/common';

import type { RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import type { RawKibanaPrivileges } from '@kbn/security-authorization-core';
import { KibanaPrivilege } from './kibana_privilege';
import { PrivilegeCollection } from './privilege_collection';
import { SecuredFeature } from './secured_feature';

function toBasePrivilege(entry: [string, string[]]): [string, KibanaPrivilege] {
  const [privilegeId, actions] = entry;
  return [privilegeId, new KibanaPrivilege(privilegeId, actions)];
}

function recordsToBasePrivilegeMap(
  record: Record<string, string[]>
): ReadonlyMap<string, KibanaPrivilege> {
  return new Map(Object.entries(record).map((entry) => toBasePrivilege(entry)));
}

/**
 * Determines if the passed privilege spec defines global privileges.
 * @param privilegeSpec
 */
export function isGlobalPrivilegeDefinition(privilegeSpec: RoleKibanaPrivilege): boolean {
  if (!privilegeSpec.spaces || privilegeSpec.spaces.length === 0) {
    return true;
  }
  return privilegeSpec.spaces.includes('*');
}

export class KibanaPrivileges {
  private global: ReadonlyMap<string, KibanaPrivilege>;

  private spaces: ReadonlyMap<string, KibanaPrivilege>;

  private feature: ReadonlyMap<string, SecuredFeature>;

  constructor(rawKibanaPrivileges: RawKibanaPrivileges, features: KibanaFeature[]) {
    this.global = recordsToBasePrivilegeMap(rawKibanaPrivileges.global);
    this.spaces = recordsToBasePrivilegeMap(rawKibanaPrivileges.space);
    this.feature = new Map(
      features.map((feature) => {
        const rawPrivs = rawKibanaPrivileges.features[feature.id];
        return [feature.id, new SecuredFeature(feature.toRaw(), rawPrivs)];
      })
    );
  }

  public getBasePrivileges(entry: RoleKibanaPrivilege) {
    if (isGlobalPrivilegeDefinition(entry)) {
      return Array.from(this.global.values());
    }
    return Array.from(this.spaces.values());
  }

  public getSecuredFeature(featureId: string) {
    return this.feature.get(featureId)!;
  }

  public getSecuredFeatures() {
    return Array.from(this.feature.values());
  }

  public createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]) {
    const filterAssigned = (assignedPrivileges: string[]) => (privilege: KibanaPrivilege) =>
      Array.isArray(assignedPrivileges) && assignedPrivileges.includes(privilege.id);

    const privileges: KibanaPrivilege[] = roleKibanaPrivileges
      .map((entry) => {
        const assignedBasePrivileges = this.getBasePrivileges(entry).filter(
          filterAssigned(entry.base)
        );

        const assignedFeaturePrivileges: KibanaPrivilege[][] = Object.entries(entry.feature).map(
          ([featureId, assignedFeaturePrivs]) => {
            return this.getFeaturePrivileges(featureId).filter(
              filterAssigned(assignedFeaturePrivs)
            );
          }
        );

        return [assignedBasePrivileges, assignedFeaturePrivileges].flat(2);
      })
      .flat();

    return new PrivilegeCollection(privileges);
  }

  private getFeaturePrivileges(featureId: string) {
    return this.getSecuredFeature(featureId)?.getAllPrivileges() ?? [];
  }
}
