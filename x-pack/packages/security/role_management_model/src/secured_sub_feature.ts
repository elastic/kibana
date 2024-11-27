/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig, SubFeaturePrivilegeGroupConfig } from '@kbn/features-plugin/common';
import { SubFeature } from '@kbn/features-plugin/common';

import { SubFeaturePrivilege } from './sub_feature_privilege';
import { SubFeaturePrivilegeGroup } from './sub_feature_privilege_group';

export class SecuredSubFeature extends SubFeature {
  public readonly privileges: SubFeaturePrivilege[];
  public readonly privilegesTooltip: string;
  /**
   * A list of the privilege groups that have at least one enabled privilege.
   */
  private readonly nonEmptyPrivilegeGroups: SubFeaturePrivilegeGroupConfig[];

  constructor(
    config: SubFeatureConfig,
    private readonly actionMapping: { [privilegeId: string]: string[] } = {}
  ) {
    super(config);

    this.privilegesTooltip = config.privilegesTooltip || '';

    this.nonEmptyPrivilegeGroups = this.privilegeGroups.flatMap((group) => {
      const filteredPrivileges = group.privileges.filter((privilege) => !privilege.disabled);
      if (filteredPrivileges.length === 0) {
        return [];
      }

      // If some privileges are disabled, we need to update the group to reflect the change.
      return [
        group.privileges.length === filteredPrivileges.length
          ? group
          : ({ ...group, privileges: filteredPrivileges } as SubFeaturePrivilegeGroupConfig),
      ];
    });

    this.privileges = Array.from(this.privilegeIterator());
  }

  public getPrivilegeGroups() {
    return this.nonEmptyPrivilegeGroups.map(
      (pg) => new SubFeaturePrivilegeGroup(pg, this.actionMapping)
    );
  }

  public *privilegeIterator({
    predicate = () => true,
  }: {
    predicate?: (privilege: SubFeaturePrivilege, feature: SecuredSubFeature) => boolean;
  } = {}): IterableIterator<SubFeaturePrivilege> {
    for (const group of this.nonEmptyPrivilegeGroups) {
      for (const gp of group.privileges) {
        const privilege = new SubFeaturePrivilege(gp, this.actionMapping[gp.id]);
        if (predicate(privilege, this)) {
          yield privilege;
        }
      }
    }
  }

  public getDescription() {
    return this.description;
  }
}
