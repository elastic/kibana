/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivileges, Role, RoleKibanaPrivilege } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { buildRole, BuildRoleOpts, defaultPrivilegeDefinition } from './__fixtures__';
import { KibanaBasePrivilegeCalculator } from './kibana_base_privilege_calculator';
import { KibanaFeaturePrivilegeCalculator } from './kibana_feature_privilege_calculator';
import { PRIVILEGE_SOURCE } from './kibana_privilege_calculator_types';

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

const buildEffectiveFeaturePrivilegeCalculator = (
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

  const rankedFeaturePrivileges = kibanaPrivileges.getFeaturePrivileges().getAllPrivileges();

  return new KibanaFeaturePrivilegeCalculator(
    kibanaPrivileges,
    globalPrivilegeSpec,
    globalActions,
    rankedFeaturePrivileges
  );
};

interface TestOpts {
  only?: boolean;
  role?: BuildRoleOpts;
  privilegeIndex?: number;
  ignoreAssigned?: boolean;
  result: Record<string, any>;
  feature?: string;
}

function runTest(
  description: string,
  {
    role: roleOpts = {},
    result = {},
    privilegeIndex = 0,
    ignoreAssigned = false,
    only = false,
    feature = 'feature1',
  }: TestOpts
) {
  const fn = only ? it.only : it;
  fn(description, () => {
    const role = buildRole(roleOpts);
    const basePrivilegeCalculator = buildEffectiveBasePrivilegeCalculator(role);
    const featurePrivilegeCalculator = buildEffectiveFeaturePrivilegeCalculator(role);

    const baseExplanation = basePrivilegeCalculator.getMostPermissiveBasePrivilege(
      role.kibana[privilegeIndex],
      // If calculations wish to ignoreAssigned, then we still need to know what the real effective base privilege is
      // without ignoring assigned, in order to calculate the correct feature privileges.
      false
    );

    const actualResult = featurePrivilegeCalculator.getMostPermissiveFeaturePrivilege(
      role.kibana[privilegeIndex],
      baseExplanation,
      feature,
      ignoreAssigned
    );

    expect(actualResult).toEqual(result);
  });
}

describe('getMostPermissiveFeaturePrivilege', () => {
  describe('for global feature privileges, without ignoring assigned', () => {
    runTest('returns "none" when no privileges are granted', {
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "read" when assigned directly to the feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "read" when assigned as the global base privilege', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      },
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      },
    });

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
          supersededPrivilege: 'read',
          supersededPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the feature privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
              },
            },
          ],
        },
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
          isDirectlyAssigned: true,
        },
      }
    );
  });

  describe('for global feature privileges, ignoring assigned', () => {
    runTest('returns "none" when no privileges are granted', {
      ignoreAssigned: true,
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "none" when "read" is assigned directly to the feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      ignoreAssigned: true,
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "read" when assigned as the global base privilege', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      },
      ignoreAssigned: true,
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      },
    });

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "read" when "all" assigned as the feature privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
              },
            },
          ],
        },
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'read',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );
  });

  describe('for space feature privileges, without ignoring assigned', () => {
    runTest('returns "none" when no privileges are granted', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            base: [],
            feature: {},
          },
        ],
      },
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "read" when assigned directly to the feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
        directlyAssignedFeaturePrivilegeMorePermissiveThanBase: true,
      },
    });

    runTest('returns "read" when assigned as the global base privilege', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {},
          },
        ],
      },
      privilegeIndex: 1,
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      },
    });

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned global feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
              },
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned space feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
          supersededPrivilege: 'read',
          supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global feature privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
              },
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the space feature privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['all'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
          isDirectlyAssigned: true,
          directlyAssignedFeaturePrivilegeMorePermissiveThanBase: true,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the space base privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: ['all'],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned space feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
          supersededPrivilege: 'read',
          supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        },
      }
    );

    runTest('returns "all" when assigned everywhere, without indicating override', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {
              feature1: ['all'],
            },
          },
          {
            spaces: ['marketing'],
            base: ['all'],
            feature: {
              feature1: ['all'],
            },
          },
        ],
      },
      privilegeIndex: 1,
      result: {
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
        directlyAssignedFeaturePrivilegeMorePermissiveThanBase: false,
      },
    });

    runTest('returns "all" when assigned at global feature, overriding space feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['all'],
            },
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      privilegeIndex: 1,
      result: {
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: false,
        supersededPrivilege: 'read',
        supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
      },
    });

    describe('feature with "all" excluded from base privileges', () => {
      runTest('returns "read" when "all" assigned as the global base privilege', {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {},
            },
          ],
        },
        feature: 'feature4',
        privilegeIndex: 1,
        result: {
          actualPrivilege: 'read',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      });

      runTest(
        'returns "read" when "all" assigned as the global base privilege, which does not override assigned space feature privilege',
        {
          role: {
            spacesPrivileges: [
              {
                spaces: ['*'],
                base: ['all'],
                feature: {},
              },
              {
                spaces: ['marketing'],
                base: [],
                feature: {
                  feature4: ['read'],
                },
              },
            ],
          },
          feature: 'feature4',
          privilegeIndex: 1,
          result: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
            isDirectlyAssigned: true,
            directlyAssignedFeaturePrivilegeMorePermissiveThanBase: false,
          },
        }
      );

      runTest(
        'returns "all" when assigned as the feature privilege, which is more permissive than the base privilege',
        {
          role: {
            spacesPrivileges: [
              {
                spaces: ['*'],
                base: ['all'],
                feature: {},
              },
              {
                spaces: ['marketing'],
                base: [],
                feature: {
                  feature4: ['all'],
                },
              },
            ],
          },
          feature: 'feature4',
          privilegeIndex: 1,
          result: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
            isDirectlyAssigned: true,
            directlyAssignedFeaturePrivilegeMorePermissiveThanBase: true,
          },
        }
      );
    });
  });

  describe('for space feature privileges, ignoring assigned', () => {
    runTest('returns "none" when no privileges are granted', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            base: [],
            feature: {},
          },
        ],
      },
      ignoreAssigned: true,
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "none" when "read" assigned directly to the feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      ignoreAssigned: true,
      result: {
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
      },
    });

    runTest('returns "read" when assigned as the global base privilege', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {},
          },
        ],
      },
      privilegeIndex: 1,
      ignoreAssigned: true,
      result: {
        actualPrivilege: 'read',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      },
    });

    runTest(
      'returns "all" when assigned as the global base privilege, which overrides assigned global feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
              },
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global base privilege, which normally overrides assigned space feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global feature privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
              },
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "read" when "all" assigned as the space feature privilege, which normally overrides assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['all'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'read',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the space base privilege, which does not override assigned global base privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: ['all'],
              feature: {},
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest(
      'returns "all" when assigned as the global base privilege, which normally overrides assigned space feature privilege',
      {
        role: {
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['marketing'],
              base: [],
              feature: {
                feature1: ['read'],
              },
            },
          ],
        },
        privilegeIndex: 1,
        ignoreAssigned: true,
        result: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
      }
    );

    runTest('returns "all" when assigned everywhere, without indicating override', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {
              feature1: ['all'],
            },
          },
          {
            spaces: ['marketing'],
            base: ['all'],
            feature: {
              feature1: ['all'],
            },
          },
        ],
      },
      privilegeIndex: 1,
      ignoreAssigned: true,
      result: {
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
        isDirectlyAssigned: false,
      },
    });

    runTest('returns "all" when assigned at global feature, normally overriding space feature', {
      role: {
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['all'],
            },
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      },
      privilegeIndex: 1,
      ignoreAssigned: true,
      result: {
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        isDirectlyAssigned: false,
      },
    });
  });
});
