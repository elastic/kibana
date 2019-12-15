/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { FeaturesPrivileges, KibanaPrivileges, RoleKibanaPrivilege } from '../../../common/model';
import { areActionsFullyCovered } from '../../../../../../plugins/security/common/privilege_calculator_utils';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import {
  PRIVILEGE_SOURCE,
  PrivilegeExplanation,
  PrivilegeScenario,
} from './kibana_privilege_calculator_types';

export class KibanaFeaturePrivilegeCalculator {
  constructor(
    private readonly kibanaPrivileges: KibanaPrivileges,
    private readonly globalPrivilege: RoleKibanaPrivilege,
    private readonly assignedGlobalBaseActions: string[],
    private readonly rankedFeaturePrivileges: FeaturesPrivileges
  ) {}

  public getMostPermissiveFeaturePrivilege(
    privilegeSpec: RoleKibanaPrivilege,
    basePrivilegeExplanation: PrivilegeExplanation,
    featureId: string,
    ignoreAssigned: boolean
  ): PrivilegeExplanation {
    const scenarios = this.buildFeaturePrivilegeScenarios(
      privilegeSpec,
      basePrivilegeExplanation,
      featureId,
      ignoreAssigned
    );

    const featurePrivileges = this.rankedFeaturePrivileges[featureId] || [];

    // inspect feature privileges in ranked order (most permissive -> least permissive)
    for (const featurePrivilege of featurePrivileges) {
      const actions = this.kibanaPrivileges
        .getFeaturePrivileges()
        .getActions(featureId, featurePrivilege);

      // check if any of the scenarios satisfy the privilege - first one wins.
      for (const scenario of scenarios) {
        if (areActionsFullyCovered(scenario.actions, actions)) {
          return {
            actualPrivilege: featurePrivilege,
            actualPrivilegeSource: scenario.actualPrivilegeSource,
            isDirectlyAssigned: scenario.isDirectlyAssigned,
            directlyAssignedFeaturePrivilegeMorePermissiveThanBase:
              scenario.directlyAssignedFeaturePrivilegeMorePermissiveThanBase,
            ...this.buildSupercededFields(
              !scenario.isDirectlyAssigned,
              scenario.supersededPrivilege,
              scenario.supersededPrivilegeSource
            ),
          };
        }
      }
    }

    const isGlobal = isGlobalPrivilegeDefinition(privilegeSpec);
    return {
      actualPrivilege: NO_PRIVILEGE_VALUE,
      actualPrivilegeSource: isGlobal
        ? PRIVILEGE_SOURCE.GLOBAL_FEATURE
        : PRIVILEGE_SOURCE.SPACE_FEATURE,
      isDirectlyAssigned: true,
    };
  }

  private buildFeaturePrivilegeScenarios(
    privilegeSpec: RoleKibanaPrivilege,
    basePrivilegeExplanation: PrivilegeExplanation,
    featureId: string,
    ignoreAssigned: boolean
  ): PrivilegeScenario[] {
    const scenarios: PrivilegeScenario[] = [];

    const isGlobalPrivilege = isGlobalPrivilegeDefinition(privilegeSpec);

    const assignedGlobalFeaturePrivilege = this.getAssignedFeaturePrivilege(
      this.globalPrivilege,
      featureId
    );

    const assignedFeaturePrivilege = this.getAssignedFeaturePrivilege(privilegeSpec, featureId);
    const hasAssignedFeaturePrivilege =
      !ignoreAssigned && assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE;

    scenarios.push({
      actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
      isDirectlyAssigned: false,
      actions: [...this.assignedGlobalBaseActions],
      ...this.buildSupercededFields(
        hasAssignedFeaturePrivilege,
        assignedFeaturePrivilege,
        isGlobalPrivilege ? PRIVILEGE_SOURCE.GLOBAL_FEATURE : PRIVILEGE_SOURCE.SPACE_FEATURE
      ),
    });

    if (!isGlobalPrivilege || !ignoreAssigned) {
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        actions: this.getFeatureActions(featureId, assignedGlobalFeaturePrivilege),
        isDirectlyAssigned: isGlobalPrivilege && hasAssignedFeaturePrivilege,
        ...this.buildSupercededFields(
          hasAssignedFeaturePrivilege && !isGlobalPrivilege,
          assignedFeaturePrivilege,
          PRIVILEGE_SOURCE.SPACE_FEATURE
        ),
      });
    }

    if (isGlobalPrivilege) {
      return this.rankScenarios(scenarios);
    }

    // Otherwise, this is a space feature privilege

    const includeSpaceBaseScenario =
      basePrivilegeExplanation.actualPrivilegeSource === PRIVILEGE_SOURCE.SPACE_BASE ||
      basePrivilegeExplanation.supersededPrivilegeSource === PRIVILEGE_SOURCE.SPACE_BASE;

    const spaceBasePrivilege =
      basePrivilegeExplanation.supersededPrivilege || basePrivilegeExplanation.actualPrivilege;

    if (includeSpaceBaseScenario) {
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
        isDirectlyAssigned: false,
        actions: this.getBaseActions(PRIVILEGE_SOURCE.SPACE_BASE, spaceBasePrivilege),
        ...this.buildSupercededFields(
          hasAssignedFeaturePrivilege,
          assignedFeaturePrivilege,
          PRIVILEGE_SOURCE.SPACE_FEATURE
        ),
      });
    }

    if (!ignoreAssigned) {
      const actions = this.getFeatureActions(
        featureId,
        this.getAssignedFeaturePrivilege(privilegeSpec, featureId)
      );
      const directlyAssignedFeaturePrivilegeMorePermissiveThanBase = !areActionsFullyCovered(
        this.assignedGlobalBaseActions,
        actions
      );
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
        directlyAssignedFeaturePrivilegeMorePermissiveThanBase,
        actions,
      });
    }

    return this.rankScenarios(scenarios);
  }

  private rankScenarios(scenarios: PrivilegeScenario[]): PrivilegeScenario[] {
    return scenarios.sort(
      (scenario1, scenario2) => scenario1.actualPrivilegeSource - scenario2.actualPrivilegeSource
    );
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

  private getFeatureActions(featureId: string, privilegeId: string) {
    return this.kibanaPrivileges.getFeaturePrivileges().getActions(featureId, privilegeId);
  }

  private getAssignedFeaturePrivilege(privilegeSpec: RoleKibanaPrivilege, featureId: string) {
    const featureEntry = privilegeSpec.feature[featureId] || [];
    return featureEntry[0] || NO_PRIVILEGE_VALUE;
  }

  private buildSupercededFields(
    isSuperceding: boolean,
    supersededPrivilege?: string,
    supersededPrivilegeSource?: PRIVILEGE_SOURCE
  ) {
    if (!isSuperceding) {
      return {};
    }
    return {
      supersededPrivilege,
      supersededPrivilegeSource,
    };
  }
}
