/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivileges, Role, RoleKibanaPrivilege } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { buildRole, defaultPrivilegeDefinition } from './__fixtures__';
import { KibanaBasePrivilegeCalculator } from './kibana_base_privilege_calculator';
import { PRIVILEGE_SOURCE, PrivilegeExplanation } from './kibana_privilege_calculator_types';

const buildEffectiveBasePrivilegeCalculator = (
  role: Role,
  kibanaPrivileges: KibanaPrivileges = defaultPrivilegeDefinition
) => {
  const globalPrivilegeSpec =
    role.kibana.find(k => isGlobalPrivilegeDefinition(k)) ||
    ({
      spaces: ['*'],
      base: [],
      feature: {},
    } as RoleKibanaPrivilege);

  const globalActions = globalPrivilegeSpec.base[0]
    ? kibanaPrivileges.getGlobalPrivileges().getActions(globalPrivilegeSpec.base[0])
    : [];

  return new KibanaBasePrivilegeCalculator(kibanaPrivileges, globalPrivilegeSpec, globalActions);
};

describe('getMostPermissiveBasePrivilege', () => {
  describe('without ignoring assigned', () => {
    it('returns "none" when no privileges are granted', () => {
      const role = buildRole();
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[0],
        false
      );

      expect(result).toEqual({
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: true,
      } as PrivilegeExplanation);
    });

    defaultPrivilegeDefinition
      .getGlobalPrivileges()
      .getAllPrivileges()
      .forEach(globalBasePrivilege => {
        it(`returns "${globalBasePrivilege}" when assigned directly at the global privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['*'],
                base: [globalBasePrivilege],
                feature: {},
              },
            ],
          });
          const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            false
          );

          expect(result).toEqual({
            actualPrivilege: globalBasePrivilege,
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    defaultPrivilegeDefinition
      .getSpacesPrivileges()
      .getAllPrivileges()
      .forEach(spaceBasePrivilege => {
        it(`returns "${spaceBasePrivilege}" when assigned directly at the space base privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['foo'],
                base: [spaceBasePrivilege],
                feature: {},
              },
            ],
          });
          const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            false
          );

          expect(result).toEqual({
            actualPrivilege: spaceBasePrivilege,
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    it('returns the global privilege when no space base is defined', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ],
      });
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        false
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      } as PrivilegeExplanation);
    });

    it('returns the global privilege when it supercedes the space privilege', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['read'],
            feature: {},
          },
        ],
      });
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        false
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
        supersededPrivilege: 'read',
        supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
      } as PrivilegeExplanation);
    });
  });

  describe('ignoring assigned', () => {
    it('returns "none" when no privileges are granted', () => {
      const role = buildRole();
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[0],
        true
      );

      expect(result).toEqual({
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: true,
      } as PrivilegeExplanation);
    });

    defaultPrivilegeDefinition
      .getGlobalPrivileges()
      .getAllPrivileges()
      .forEach(globalBasePrivilege => {
        it(`returns "none" when "${globalBasePrivilege}" assigned directly at the global privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['*'],
                base: [globalBasePrivilege],
                feature: {},
              },
            ],
          });
          const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            true
          );

          expect(result).toEqual({
            actualPrivilege: NO_PRIVILEGE_VALUE,
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    defaultPrivilegeDefinition
      .getSpacesPrivileges()
      .getAllPrivileges()
      .forEach(spaceBasePrivilege => {
        it(`returns "none" when "${spaceBasePrivilege}" when assigned directly at the space base privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['foo'],
                base: [spaceBasePrivilege],
                feature: {},
              },
            ],
          });
          const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            true
          );

          expect(result).toEqual({
            actualPrivilege: NO_PRIVILEGE_VALUE,
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    it('returns the global privilege when no space base is defined', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ],
      });
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        true
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      } as PrivilegeExplanation);
    });

    it('returns the global privilege when it supercedes the space privilege, without indicating override', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['read'],
            feature: {},
          },
        ],
      });
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        true
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      } as PrivilegeExplanation);
    });

    it('returns the global privilege even though it would ordinarly be overriden by space base privilege', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['all'],
            feature: {},
          },
        ],
      });
      const effectiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        true
      );

      expect(result).toEqual({
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      } as PrivilegeExplanation);
    });
  });
});
