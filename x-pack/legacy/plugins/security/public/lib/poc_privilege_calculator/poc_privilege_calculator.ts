/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { Role } from '../../../../../../plugins/security/common/model';
import { ScopedPrivilege } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/scoped_privilege';
import { PrivilegeExplanation } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_explanation';
import { FeaturePrivilegesExplanations } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/feature_privileges_explanations';
import { Privilege } from '../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_instance';
import { KibanaPrivileges } from '../../../../../../plugins/security/common/model/poc_kibana_privileges';

export class POCPrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public _locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => this.isGlobalPrivilege(entry));
  }
  public _collectRelevantEntries(role: Role, privilegeIndex: number) {
    const entries = [];

    const entry = role.kibana[privilegeIndex];
    if (entry) {
      entries.push(entry);
    }

    const globalEntry = this._locateGlobalPrivilege(role);
    if (globalEntry && globalEntry !== entry) {
      entries.push(globalEntry);
    }

    return entries;
  }

  public getEffectiveBasePrivilege(role: Role, privilegeIndex: number) {
    const privilegeSet = role.kibana[privilegeIndex];

    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    const basePrivileges = this.isGlobalPrivilege(privilegeSet)
      ? this.kibanaPrivileges.getGlobalPrivileges()
      : this.kibanaPrivileges.getSpacesPrivileges();

    const effectiveBasePrivilege: Privilege | undefined = basePrivileges.find(
      base => collection.grantsPrivilege(base).hasAllRequested
    );

    return effectiveBasePrivilege;
  }

  public explainEffectiveBasePrivilege(role: Role, privilegeIndex: number) {
    const basePrivilege = this.getEffectiveBasePrivilege(role, privilegeIndex);
    if (!basePrivilege) {
      return;
    }

    const privilegeSet = role.kibana[privilegeIndex];
    const isGlobalPrivilege = this.isGlobalPrivilege(privilegeSet);

    const globalPrivilegeRoleEntry = isGlobalPrivilege
      ? privilegeSet
      : this._locateGlobalPrivilege(role);

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      globalPrivilegeRoleEntry ? [globalPrivilegeRoleEntry] : []
    );

    const spacePrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      privilegeSet ? [privilegeSet] : []
    );

    const globalGrantingPrivileges = globalPrivileges
      .getPrivilegesGranting(basePrivilege)
      .map(gp => new ScopedPrivilege('global', gp));

    const grantingPrivileges = isGlobalPrivilege
      ? []
      : spacePrivileges
          .getPrivilegesGranting(basePrivilege)
          .map(gp => new ScopedPrivilege('space', gp));

    return new PrivilegeExplanation(
      new ScopedPrivilege(isGlobalPrivilege ? 'global' : 'space', basePrivilege),
      {
        global: globalGrantingPrivileges,
        space: isGlobalPrivilege ? [] : grantingPrivileges,
      }
    );
  }

  public getEffectiveFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    const fp = this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      const { hasAllRequested } = collection.grantsPrivilege(privilege);
      return hasAllRequested;
    });
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

    const fp = this.kibanaPrivileges.getFeaturePrivileges(featureId).filter(privilege => {
      const { hasAllRequested } = collection.grantsPrivilege(privilege);
      return hasAllRequested;
    });
    return fp;
  }

  public explainAllEffectiveFeaturePrivileges(
    role: Role,
    privilegeIndex: number
  ): FeaturePrivilegesExplanations {
    const featurePrivileges = this.kibanaPrivileges.getAllFeaturePrivileges();

    const results: FeaturePrivilegesExplanations[] = Array.from(
      featurePrivileges.keys()
    ).map(featureId => this.explainEffectiveFeaturePrivileges(role, privilegeIndex, featureId));

    return FeaturePrivilegesExplanations.compose(results);
  }

  public explainEffectiveFeaturePrivileges(
    role: Role,
    privilegeIndex: number,
    featureId: string
  ): FeaturePrivilegesExplanations {
    const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges(featureId);

    const results: { [privilegeId: string]: PrivilegeExplanation } = {};

    for (const featurePrivilege of featurePrivileges) {
      const privilegeId = featurePrivilege.id;
      results[privilegeId] = this.explainEffectiveFeaturePrivilege(
        role,
        privilegeIndex,
        featureId,
        privilegeId
      );
    }

    return new FeaturePrivilegesExplanations({ [featureId]: results });
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

  private isGlobalPrivilege({ spaces = [] }: { spaces?: string[] } = {}) {
    return spaces.includes('*');
  }
}
