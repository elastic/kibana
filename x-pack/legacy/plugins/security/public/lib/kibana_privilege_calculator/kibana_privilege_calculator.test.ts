/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivileges, Role } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import {
  buildRole,
  defaultPrivilegeDefinition,
  fullyRestrictedBasePrivileges,
  fullyRestrictedFeaturePrivileges,
  unrestrictedBasePrivileges,
  unrestrictedFeaturePrivileges,
} from './__fixtures__';
import {
  AllowedPrivilege,
  PRIVILEGE_SOURCE,
  PrivilegeExplanation,
} from './kibana_privilege_calculator_types';
import { KibanaPrivilegeCalculatorFactory } from './kibana_privileges_calculator_factory';

const buildEffectivePrivileges = (
  role: Role,
  kibanaPrivileges: KibanaPrivileges = defaultPrivilegeDefinition
) => {
  const factory = new KibanaPrivilegeCalculatorFactory(kibanaPrivileges);
  return factory.getInstance(role);
};

interface BuildExpectedFeaturePrivilegesOption {
  features: string[];
  privilegeExplanation: PrivilegeExplanation;
}

const buildExpectedFeaturePrivileges = (options: BuildExpectedFeaturePrivilegesOption[]) => {
  return {
    feature: options.reduce((acc1, option) => {
      return {
        ...acc1,
        ...option.features.reduce((acc2, featureId) => {
          return {
            ...acc2,
            [featureId]: option.privilegeExplanation,
          };
        }, {}),
      };
    }, {}),
  };
};

describe('calculateEffectivePrivileges', () => {
  it(`returns an empty array for an empty role`, () => {
    const role = buildRole();
    role.kibana = [];

    const effectivePrivileges = buildEffectivePrivileges(role);
    const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();
    expect(calculatedPrivileges).toHaveLength(0);
  });

  it(`calculates "none" for all privileges when nothing is assigned`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['foo', 'bar'],
          base: [],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivileges(role);
    const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();
    expect(calculatedPrivileges).toEqual([
      {
        base: {
          actualPrivilege: NO_PRIVILEGE_VALUE,
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          isDirectlyAssigned: true,
        },
        ...buildExpectedFeaturePrivileges([
          {
            features: ['feature1', 'feature2', 'feature3', 'feature4'],
            privilegeExplanation: {
              actualPrivilege: NO_PRIVILEGE_VALUE,
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            },
          },
        ]),
      },
    ]);
  });

  describe(`with global base privilege of "all"`, () => {
    it(`calculates global feature privilege of all for features 1-3 and read for feature 4`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2', 'feature3'],
              privilegeExplanation: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
      ]);
    });

    it(`calculates space base and feature privilege of all for features 1-3 and read for feature 4`, () => {
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
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      const calculatedSpacePrivileges = calculatedPrivileges[1];

      expect(calculatedSpacePrivileges).toEqual({
        base: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
        ...buildExpectedFeaturePrivileges([
          {
            features: ['feature1', 'feature2', 'feature3'],
            privilegeExplanation: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
          },
          {
            features: ['feature4'],
            privilegeExplanation: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
          },
        ]),
      });
    });

    describe(`and with feature privileges assigned`, () => {
      it('returns the base privileges when they are more permissive', () => {
        const role = buildRole({
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
                feature2: ['read'],
                feature3: ['read'],
                feature4: ['read'],
              },
            },
            {
              spaces: ['foo'],
              base: [],
              feature: {
                feature1: ['read'],
                feature2: ['read'],
                feature3: ['read'],
                feature4: ['read'],
              },
            },
          ],
        });
        const effectivePrivileges = buildEffectivePrivileges(role);
        const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

        expect(calculatedPrivileges).toEqual([
          {
            base: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: true,
            },
            ...buildExpectedFeaturePrivileges([
              {
                features: ['feature1', 'feature2', 'feature3'],
                privilegeExplanation: {
                  actualPrivilege: 'all',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                  isDirectlyAssigned: false,
                  supersededPrivilege: 'read',
                  supersededPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                },
              },
              {
                features: ['feature4'],
                privilegeExplanation: {
                  actualPrivilege: 'read',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                  isDirectlyAssigned: true,
                },
              },
            ]),
          },
          {
            base: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            ...buildExpectedFeaturePrivileges([
              {
                features: ['feature1', 'feature2', 'feature3'],
                privilegeExplanation: {
                  actualPrivilege: 'all',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                  isDirectlyAssigned: false,
                  supersededPrivilege: 'read',
                  supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
                },
              },
              {
                features: ['feature4'],
                privilegeExplanation: {
                  actualPrivilege: 'read',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
                  isDirectlyAssigned: true,
                  directlyAssignedFeaturePrivilegeMorePermissiveThanBase: false,
                },
              },
            ]),
          },
        ]);
      });
    });
  });

  describe(`with global base privilege of "read"`, () => {
    it(`it calculates space base and feature privileges when none are provided`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature3'],
              privilegeExplanation: {
                actualPrivilege: NO_PRIVILEGE_VALUE,
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature3'],
              privilegeExplanation: {
                actualPrivilege: NO_PRIVILEGE_VALUE,
                actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
                isDirectlyAssigned: true,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
      ]);
    });

    describe('and with feature privileges assigned', () => {
      it('returns the feature privileges when they are more permissive', () => {
        const role = buildRole({
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
                feature2: ['all'],
                feature3: ['all'],
                feature4: ['all'],
              },
            },
            {
              spaces: ['foo'],
              base: [],
              feature: {
                feature1: ['all'],
                feature2: ['all'],
                feature3: ['all'],
                feature4: ['all'],
              },
            },
          ],
        });
        const effectivePrivileges = buildEffectivePrivileges(role);
        const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

        expect(calculatedPrivileges).toEqual([
          {
            base: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: true,
            },
            ...buildExpectedFeaturePrivileges([
              {
                features: ['feature1', 'feature2', 'feature3', 'feature4'],
                privilegeExplanation: {
                  actualPrivilege: 'all',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                  isDirectlyAssigned: true,
                },
              },
            ]),
          },
          {
            base: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            ...buildExpectedFeaturePrivileges([
              {
                features: ['feature1', 'feature2', 'feature3', 'feature4'],
                privilegeExplanation: {
                  actualPrivilege: 'all',
                  actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
                  isDirectlyAssigned: true,
                  directlyAssignedFeaturePrivilegeMorePermissiveThanBase: true,
                },
              },
            ]),
          },
        ]);
      });
    });
  });

  describe('with both global and space base privileges assigned', () => {
    it(`does not override space base of "all" when global base is "read"`, () => {
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
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature3'],
              privilegeExplanation: {
                actualPrivilege: NO_PRIVILEGE_VALUE,
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2', 'feature3'],
              privilegeExplanation: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
      ]);
    });

    it(`calculates "all" for space base and space features when superceded by global "all"`, () => {
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
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2', 'feature3'],
              privilegeExplanation: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
            supersededPrivilege: 'read',
            supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2', 'feature3'],
              privilegeExplanation: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
      ]);
    });

    it(`does not override feature privileges when they are more permissive`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['read'],
            feature: {
              feature1: ['all'],
              feature2: ['all'],
              feature3: ['all'],
              feature4: ['all'],
            },
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
            {
              features: ['feature3'],
              privilegeExplanation: {
                actualPrivilege: NO_PRIVILEGE_VALUE,
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
            },
            {
              features: ['feature4'],
              privilegeExplanation: {
                actualPrivilege: 'read',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
                isDirectlyAssigned: false,
              },
            },
          ]),
        },
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
            supersededPrivilege: 'read',
            supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          },
          ...buildExpectedFeaturePrivileges([
            {
              features: ['feature1', 'feature2', 'feature3', 'feature4'],
              privilegeExplanation: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
                isDirectlyAssigned: true,
                directlyAssignedFeaturePrivilegeMorePermissiveThanBase: true,
              },
            },
          ]),
        },
      ]);
    });
  });
});

describe('calculateAllowedPrivileges', () => {
  it('allows all privileges when none are currently assigned', () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {},
        },
        {
          spaces: ['foo'],
          base: [],
          feature: {},
        },
      ],
    });

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
    ]);
  });

  it('allows all global base privileges, but just "all" for everything else when global is set to "all"', () => {
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

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...fullyRestrictedFeaturePrivileges,
      },
      {
        ...fullyRestrictedBasePrivileges,
        ...fullyRestrictedFeaturePrivileges,
      },
    ]);
  });

  it(`allows feature privileges to be set to "all" or "read" when global base is "read"`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: ['read'],
          feature: {},
        },
        {
          spaces: ['foo'],
          base: [],
          feature: {},
        },
      ],
    });

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    const expectedFeaturePrivileges = {
      feature: {
        feature1: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        feature2: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        feature3: {
          privileges: ['all'],
          canUnassign: true, // feature 3 has no "read" privilege governed by global "all"
        },
        feature4: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
      },
    };

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...expectedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        ...expectedFeaturePrivileges,
      },
    ]);
  });

  it(`allows feature privileges to be set to "all" or "read" when space base is "read"`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {},
        },
        {
          spaces: ['foo'],
          base: ['read'],
          feature: {},
        },
      ],
    });

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: true,
        },
        feature: {
          feature1: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: true, // feature 3 has no "read" privilege governed by space "all"
          },
          feature4: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
        },
      },
    ]);
  });

  it(`allows space base privilege to be set to "all" or "read" when space base is already "all"`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['foo'],
          base: ['all'],
          feature: {},
        },
      ],
    });

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        feature: {
          feature1: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature4: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
        },
      },
    ]);
  });

  it(`restricts space feature privileges when global feature privileges are set`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {
            feature1: ['all'],
            feature2: ['read'],
            feature4: ['all'],
          },
        },
        {
          spaces: ['foo'],
          base: [],
          feature: {},
        },
      ],
    });

    const privilegeCalculator = buildEffectivePrivileges(role);

    const result: AllowedPrivilege[] = privilegeCalculator.calculateAllowedPrivileges();

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: true,
        },
        feature: {
          feature1: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: true, // feature 3 has no "read" privilege governed by space "all"
          },
          feature4: {
            privileges: ['all'],
            canUnassign: false,
          },
        },
      },
    ]);
  });
});
