/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { ScopedPrivilege } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/scoped_privilege';
import { PrivilegeExplanation } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_explanation';
import { Privilege } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_instance';
import { KibanaPrivileges } from '../../../../../../plugins/security/common/model/poc_kibana_privileges';
import { Role } from '../../../common/model';

export class POCPrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public _locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => this.isGlobalPrivilege(entry));
  }
  public _collectRelevantEntries(role: Role, privilegeIndex: number) {
    const entry = role.kibana[privilegeIndex];
    const globalEntry = this._locateGlobalPrivilege(role);
    if (!globalEntry || globalEntry === entry) {
      return [entry];
    }
    return [entry, globalEntry];
  }

  public getEffectiveBasePrivilege(role: Role, privilegeIndex: number) {
    const privilegeSet = role.kibana[privilegeIndex];

    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    const basePrivileges = this.isGlobalPrivilege(privilegeSet)
      ? this.kibanaPrivileges.getGlobalPrivileges()
      : this.kibanaPrivileges.getSpacesPrivileges();

    const effectiveBasePrivilege = basePrivileges.find(
      base => collection.grantsPrivilege(base).hasAllRequested
    );

    return effectiveBasePrivilege;
  }

  public getEffectiveFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    console.group(`getEffectiveFeaturePrivileges(${featureId})`);
    const fp = this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      const { hasAllRequested, missing } = collection.grantsPrivilege(privilege);
      console.log({ featureId, privilege, hasAllRequested, missing });
      return hasAllRequested;
    });
    console.groupEnd();
    return fp;
  }

  public getInheritedFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const assignedFeaturePrivileges = role.kibana[privilegeIndex]?.feature[featureId] ?? [];
    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges
      .createCollectionFromRoleKibanaPrivileges(entries)
      .without(
        ...assignedFeaturePrivileges.map(afp => ({ type: 'feature' as Privilege['type'], id: afp }))
      );

    console.group(`getInheritedFeaturePrivileges(${featureId})`);
    const fp = this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      const { hasAllRequested, missing } = collection.grantsPrivilege(privilege);
      console.log({ featureId, privilege, hasAllRequested, missing });
      return hasAllRequested;
    });
    console.groupEnd();
    return fp;
  }

  public explainAllEffectiveFeaturePrivileges(
    role: Role,
    privilegeIndex: number
  ): { [featureId: string]: { [privilegeId: string]: PrivilegeExplanation } } {
    const featurePrivileges = this.kibanaPrivileges.getAllFeaturePrivileges();

    const result: ReturnType<POCPrivilegeCalculator['explainAllEffectiveFeaturePrivileges']> = {};

    for (const featurePrivilegeEntry of featurePrivileges.entries()) {
      const [featureId, privileges] = featurePrivilegeEntry;
      result[featureId] = {};
      for (const featurePrivilege of privileges) {
        const [privilegeId] = featurePrivilege;
        result[featureId][privilegeId] = this.explainEffectiveFeaturePrivilege(
          role,
          privilegeIndex,
          featureId,
          privilegeId
        );
      }
    }
    return result;
  }

  public explainEffectiveFeaturePrivileges(
    role: Role,
    privilegeIndex: number,
    featureId: string
  ): { [privilegeId: string]: PrivilegeExplanation } {
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges(featureId);

    const result: ReturnType<POCPrivilegeCalculator['explainEffectiveFeaturePrivileges']> = {};

    for (const featurePrivilege of featurePrivileges) {
      const privilegeId = featurePrivilege.id;
      result[privilegeId] = this.explainEffectiveFeaturePrivilege(
        role,
        privilegeIndex,
        featureId,
        privilegeId
      );
    }

    return result;
  }

  public explainEffectiveFeaturePrivilege(
    role: Role,
    privilegeIndex: number,
    featureId: string,
    privilegeId: string
  ) {
    const privileges = role.kibana[privilegeIndex];

    const isGlobalPrivilege = this.isGlobalPrivilege(privileges);

    const globalPrivilegeRoleEntry = isGlobalPrivilege
      ? privileges
      : this._locateGlobalPrivilege(role);

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      globalPrivilegeRoleEntry ? [globalPrivilegeRoleEntry] : []
    );

    const spacePrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      privileges,
    ]);

    const featurePrivilege = this.kibanaPrivileges
      .getFeaturePrivileges(featureId)
      .find(p => p.id === privilegeId)!;

    const globalGrantingPrivileges = globalPrivileges
      .getPrivilegesGranting(featurePrivilege)
      .map(gp => new ScopedPrivilege('global', gp));

    const grantingPrivileges = isGlobalPrivilege
      ? []
      : spacePrivileges
          .getPrivilegesGranting(featurePrivilege)
          .map(gp => new ScopedPrivilege('space', gp));

    return new PrivilegeExplanation(
      new ScopedPrivilege(isGlobalPrivilege ? 'global' : 'space', featurePrivilege),
      {
        global: globalGrantingPrivileges,
        space: isGlobalPrivilege ? [] : grantingPrivileges,
      }
    );
  }

  public getAssignedFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const entry = role.kibana[privilegeIndex];
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);

    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges(featureId);
    return featurePrivileges.filter(fp => collection.grantsPrivilege(fp).hasAllRequested);
  }

  private isGlobalPrivilege({ spaces }: { spaces: string[] }) {
    return spaces.includes('*');
  }
}
