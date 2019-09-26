/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { KibanaPrivileges, Role, RoleKibanaPrivilege } from '../../../common/model';
import { areActionsFullyCovered, compareActions } from '../../../common/privilege_calculator_utils';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import {
  AllowedPrivilege,
  CalculatedPrivilege,
  PRIVILEGE_SOURCE,
} from './kibana_privilege_calculator_types';

export class KibanaAllowedPrivilegesCalculator {
  // reference to the global privilege definition
  private globalPrivilege: RoleKibanaPrivilege;

  // list of privilege actions that comprise the global base privilege
  private assignedGlobalBaseActions: string[];

  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {
    this.globalPrivilege = this.locateGlobalPrivilege(role);
    this.assignedGlobalBaseActions = this.globalPrivilege.base[0]
      ? kibanaPrivileges.getGlobalPrivileges().getActions(this.globalPrivilege.base[0])
      : [];
  }

  public calculateAllowedPrivileges(
    effectivePrivileges: CalculatedPrivilege[]
  ): AllowedPrivilege[] {
    const { kibana = [] } = this.role;
    return kibana.map((privilegeSpec, index) =>
      this.calculateAllowedPrivilege(privilegeSpec, effectivePrivileges[index])
    );
  }

  private calculateAllowedPrivilege(
    privilegeSpec: RoleKibanaPrivilege,
    effectivePrivileges: CalculatedPrivilege
  ): AllowedPrivilege {
    const result: AllowedPrivilege = {
      base: {
        privileges: [],
        canUnassign: true,
      },
      feature: {},
    };

    if (isGlobalPrivilegeDefinition(privilegeSpec)) {
      // nothing can impede global privileges
      result.base.canUnassign = true;
      result.base.privileges = this.kibanaPrivileges.getGlobalPrivileges().getAllPrivileges();
    } else {
      // space base privileges are restricted based on the assigned global privileges
      const spacePrivileges = this.kibanaPrivileges.getSpacesPrivileges().getAllPrivileges();
      result.base.canUnassign = this.assignedGlobalBaseActions.length === 0;
      result.base.privileges = spacePrivileges.filter(privilege => {
        // always allowed to assign the calculated effective privilege
        if (privilege === effectivePrivileges.base.actualPrivilege) {
          return true;
        }

        const privilegeActions = this.getBaseActions(PRIVILEGE_SOURCE.SPACE_BASE, privilege);
        return !areActionsFullyCovered(this.assignedGlobalBaseActions, privilegeActions);
      });
    }

    const allFeaturePrivileges = this.kibanaPrivileges.getFeaturePrivileges().getAllPrivileges();
    result.feature = Object.entries(allFeaturePrivileges).reduce(
      (acc, [featureId, featurePrivileges]) => {
        return {
          ...acc,
          [featureId]: this.getAllowedFeaturePrivileges(
            effectivePrivileges,
            featureId,
            featurePrivileges
          ),
        };
      },
      {}
    );

    return result;
  }

  private getAllowedFeaturePrivileges(
    effectivePrivileges: CalculatedPrivilege,
    featureId: string,
    candidateFeaturePrivileges: string[]
  ): { privileges: string[]; canUnassign: boolean } {
    const effectiveFeaturePrivilegeExplanation = effectivePrivileges.feature[featureId];
    if (effectiveFeaturePrivilegeExplanation == null) {
      throw new Error('To calculate allowed feature privileges, we need the effective privileges');
    }

    const effectiveFeatureActions = this.getFeatureActions(
      featureId,
      effectiveFeaturePrivilegeExplanation.actualPrivilege
    );

    const privileges = [];
    if (effectiveFeaturePrivilegeExplanation.actualPrivilege !== NO_PRIVILEGE_VALUE) {
      // Always allowed to assign the calculated effective privilege
      privileges.push(effectiveFeaturePrivilegeExplanation.actualPrivilege);
    }

    privileges.push(
      ...candidateFeaturePrivileges.filter(privilegeId => {
        const candidateActions = this.getFeatureActions(featureId, privilegeId);
        return compareActions(effectiveFeatureActions, candidateActions) > 0;
      })
    );

    const result = {
      privileges: privileges.sort(),
      canUnassign: effectiveFeaturePrivilegeExplanation.actualPrivilege === NO_PRIVILEGE_VALUE,
    };

    return result;
  }

  private getBaseActions(source: PRIVILEGE_SOURCE, privilegeId: string) {
    switch (source) {
      case PRIVILEGE_SOURCE.GLOBAL_BASE:
        return this.assignedGlobalBaseActions;
      case PRIVILEGE_SOURCE.SPACE_BASE:
        return this.kibanaPrivileges.getSpacesPrivileges().getActions(privilegeId);
      default:
        throw new Error(
          `Cannot get base actions for unsupported privilege source ${PRIVILEGE_SOURCE[source]}`
        );
    }
  }

  private getFeatureActions(featureId: string, privilegeId: string): string[] {
    return this.kibanaPrivileges.getFeaturePrivileges().getActions(featureId, privilegeId);
  }

  private locateGlobalPrivilege(role: Role) {
    const spacePrivileges = role.kibana;
    return (
      spacePrivileges.find(privileges => isGlobalPrivilegeDefinition(privileges)) || {
        spaces: [] as string[],
        base: [] as string[],
        feature: {},
      }
    );
  }
}
