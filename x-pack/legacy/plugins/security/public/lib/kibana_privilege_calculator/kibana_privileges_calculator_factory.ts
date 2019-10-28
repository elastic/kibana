/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { FeaturesPrivileges, KibanaPrivileges, Role } from '../../../common/model';
import { compareActions } from '../../../../../../plugins/security/common/privilege_calculator_utils';
import { copyRole } from '../../lib/role_utils';
import { KibanaPrivilegeCalculator } from './kibana_privilege_calculator';

export class KibanaPrivilegeCalculatorFactory {
  /** All feature privileges, sorted from most permissive => least permissive. */
  public readonly rankedFeaturePrivileges: FeaturesPrivileges;

  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {
    this.rankedFeaturePrivileges = {};
    const featurePrivilegeSet = kibanaPrivileges.getFeaturePrivileges().getAllPrivileges();

    Object.entries(featurePrivilegeSet).forEach(([featureId, privileges]) => {
      this.rankedFeaturePrivileges[featureId] = privileges.sort((privilege1, privilege2) => {
        const privilege1Actions = kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, privilege1);
        const privilege2Actions = kibanaPrivileges
          .getFeaturePrivileges()
          .getActions(featureId, privilege2);
        return compareActions(privilege1Actions, privilege2Actions);
      });
    });
  }

  /**
   * Creates an KibanaPrivilegeCalculator instance for the specified role.
   * @param role
   */
  public getInstance(role: Role) {
    const roleCopy = copyRole(role);

    this.sortPrivileges(roleCopy);
    return new KibanaPrivilegeCalculator(
      this.kibanaPrivileges,
      roleCopy,
      this.rankedFeaturePrivileges
    );
  }

  private sortPrivileges(role: Role) {
    role.kibana.forEach(privilege => {
      privilege.base.sort((privilege1, privilege2) => {
        const privilege1Actions = this.kibanaPrivileges
          .getSpacesPrivileges()
          .getActions(privilege1);

        const privilege2Actions = this.kibanaPrivileges
          .getSpacesPrivileges()
          .getActions(privilege2);

        return compareActions(privilege1Actions, privilege2Actions);
      });

      Object.entries(privilege.feature).forEach(([featureId, featurePrivs]) => {
        featurePrivs.sort((privilege1, privilege2) => {
          const privilege1Actions = this.kibanaPrivileges
            .getFeaturePrivileges()
            .getActions(featureId, privilege1);

          const privilege2Actions = this.kibanaPrivileges
            .getFeaturePrivileges()
            .getActions(featureId, privilege2);

          return compareActions(privilege1Actions, privilege2Actions);
        });
      });
    });
  }
}
