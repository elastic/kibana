/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleValidator } from './validate_role';
import type { Role } from '../../../../common';

let validator: RoleValidator;

describe('validateRoleName', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it allows an alphanumeric role name', () => {
    const role: Role = {
      name: 'This-is-30-character-role-name',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRoleName(role)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Please provide a role name.`,
    });
  });

  test('it cannot exceed 1024 characters', () => {
    const role = {
      name: new Array(1026).join('A'),
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Name must not exceed 1024 characters.`,
    });
  });

  test('it cannot start with whitespace character', () => {
    const role = {
      name: ' role-name',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Name must not contain leading or trailing spaces.`,
    });
  });

  const charList = `!#%^&*()+=[]{}\|';:"/,<>?`.split('');
  charList.forEach((element) => {
    test(`it allows the "${element}" character`, () => {
      const role = {
        name: `role-${element}`,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      expect(validator.validateRoleName(role)).toEqual({ isInvalid: false });
    });
  });
});

describe('validateRoleName for serverless', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true, buildFlavor: 'serverless' });
  });

  const charList = `!#%^&*()+=[]{}\|';:"/,<>?`.split('');
  charList.forEach((element) => {
    test(`it should not allow special characters ('${element}')`, () => {
      const role = {
        name: `role${element}name`,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: true,
        error: `Name must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.`,
      });
    });
  });

  test('should throw error for contained whitespace characters', () => {
    const role = {
      name: 'role name',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };
    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Name must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.`,
    });
  });

  test('should throw error for invalid leading characters', () => {
    const invalidRoleNames = ['.rolename', '_rolename', '-rolename'];

    for (const roleName of invalidRoleNames) {
      const role = {
        name: roleName,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };
      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: true,
        error: `Name must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.`,
      });
    }
  });

  test('should throw error for leading and trailing whitespace characters', () => {
    const invalidRoleNames = [' rolename', 'rolename '];

    for (const roleName of invalidRoleNames) {
      const role = {
        name: roleName,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };
      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: true,
        error: `Name must not contain leading or trailing spaces.`,
      });
    }
  });

  test('should allow valid names', () => {
    const validRoleNames = ['rolename', 'role-name', 'role.name', 'role_name', 'role.123.role'];
    for (const roleName of validRoleNames) {
      const role = {
        name: roleName,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };
      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: false,
      });
    }
  });
});

describe('validateIndexPrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it ignores privileges with no indices defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        indices: [
          {
            names: [],
            privileges: [],
          },
        ],
        cluster: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: false,
    });
  });

  test('it requires privileges when an index is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['index-*'],
            privileges: [],
          },
        ],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: true,
    });
  });

  test('it throws when indices is not an array', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: 'asdf',
        run_as: [],
      },
      kibana: [],
    };

    // @ts-ignore
    expect(() => validator.validateIndexPrivileges(role)).toThrowErrorMatchingSnapshot();
  });
});

describe('validateRemoteIndexPrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it ignores empty remote privileges', () => {
    const role = {
      name: '',
      elasticsearch: {
        indices: [],
        remote_indices: [
          {
            clusters: [],
            names: [],
            privileges: [],
          },
        ],
        cluster: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRemoteIndexPrivileges(role)).toEqual({
      isInvalid: false,
    });
  });

  test('it requires privileges when an index is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        remote_indices: [
          {
            clusters: ['cluster'],
            names: ['index-*'],
            privileges: [],
          },
        ],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRemoteIndexPrivileges(role)).toEqual({
      isInvalid: true,
    });
  });

  test('it requires indices and privileges when clusters is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        remote_indices: [
          {
            clusters: ['cluster'],
            names: [],
            privileges: [],
          },
        ],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateRemoteIndexPrivileges(role)).toEqual({
      isInvalid: true,
    });
  });

  test('it throws when indices is not an array', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        remote_indices: 'asdf',
        run_as: [],
      },
      kibana: [],
    };

    // @ts-ignore
    expect(() => validator.validateRemoteIndexPrivileges(role)).toThrowErrorMatchingSnapshot();
  });
});

describe('validateSpacePrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  it('should validate when no privileges are defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    expect(validator.validateSpacePrivileges(role)).toEqual({ isInvalid: false });
  });

  it('should validate when a global privilege is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          base: ['all'],
          feature: {},
        },
      ],
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });

  it('should validate when a space privilege is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['marketing'],
          base: ['read'],
          feature: {},
        },
      ],
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });

  it('should validate when both global and space privileges are defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          base: ['all'],
          feature: {},
        },
        {
          spaces: ['default'],
          base: ['foo'],
          feature: {},
        },
        {
          spaces: ['marketing'],
          base: ['read'],
          feature: {},
        },
      ],
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });
});
