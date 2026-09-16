/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { KibanaFeature } from '@kbn/features-plugin/common';
import {
  getAllMinimalPrivilegeIds,
  type MinimalPrivilegeBase,
} from '@kbn/security-authorization-core-common';

import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { SecuredSubFeature } from './secured_sub_feature';
import type { SubFeaturePrivilege } from './sub_feature_privilege';

export class SecuredFeature extends KibanaFeature {
  private readonly primaryFeaturePrivileges: PrimaryFeaturePrivilege[];

  private readonly minimalPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[];

  private readonly subFeaturePrivileges: SubFeaturePrivilege[];

  private readonly securedSubFeatures: SecuredSubFeature[];

  constructor(
    config: KibanaFeatureConfig,
    actionMapping: { [privilegeId: string]: string[] } = {}
  ) {
    super(config);
    this.primaryFeaturePrivileges = Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) => new PrimaryFeaturePrivilege(id, privilege, actionMapping[id])
    );

    // One `PrimaryFeaturePrivilege` per minimal privilege id ever minted for this base privilege
    // (see `privilegeVersions`) — just the single current id when there's no version history,
    // matching today's behavior exactly. This lets a role holding a legacy minimal id (one that
    // predates the feature's current customization contract) still resolve correctly, e.g. via
    // `KibanaPrivileges.createCollectionFromRoleKibanaPrivileges`, rather than being silently
    // dropped for not matching the current id.
    this.minimalPrimaryFeaturePrivileges = Object.entries(this.config.privileges || {}).flatMap(
      ([id, privilege]) =>
        getAllMinimalPrivilegeIds(id as MinimalPrivilegeBase, privilege.privilegeVersions).map(
          (minimalPrivilegeId) =>
            new PrimaryFeaturePrivilege(
              minimalPrivilegeId,
              privilege,
              actionMapping[minimalPrivilegeId]
            )
        )
    );

    this.securedSubFeatures =
      this.config.subFeatures?.map((sf) => new SecuredSubFeature(sf, actionMapping)) ?? [];

    this.subFeaturePrivileges = this.securedSubFeatures.reduce((acc, subFeature) => {
      return [...acc, ...subFeature.privilegeIterator()];
    }, [] as SubFeaturePrivilege[]);
  }

  public getPrivilegesTooltip() {
    return this.config.privilegesTooltip;
  }

  public getAllPrivileges() {
    return [
      ...this.primaryFeaturePrivileges,
      ...this.minimalPrimaryFeaturePrivileges,
      ...this.subFeaturePrivileges,
    ];
  }

  public getPrimaryFeaturePrivileges(
    { includeMinimalFeaturePrivileges }: { includeMinimalFeaturePrivileges: boolean } = {
      includeMinimalFeaturePrivileges: false,
    }
  ) {
    return includeMinimalFeaturePrivileges
      ? [this.primaryFeaturePrivileges, this.minimalPrimaryFeaturePrivileges].flat()
      : [...this.primaryFeaturePrivileges];
  }

  public getMinimalFeaturePrivileges() {
    return [...this.minimalPrimaryFeaturePrivileges];
  }

  public getSubFeaturePrivileges() {
    return [...this.subFeaturePrivileges];
  }

  public getSubFeatures() {
    return [...this.securedSubFeatures];
  }
}
