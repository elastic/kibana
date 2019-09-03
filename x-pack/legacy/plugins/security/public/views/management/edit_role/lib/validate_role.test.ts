/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Role } from '../../../../../common/model';
import { RoleValidator } from './validate_role';

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
      error: `Please provide a role name`,
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
      error: `Name must not exceed 1024 characters`,
    });
  });

  const charList = `!#%^&*()+=[]{}\|';:"/,<>?`.split('');
  charList.forEach(element => {
    test(`it cannot support the "${element}" character`, () => {
      const role = {
        name: `role-${element}`,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: true,
        error: `Name must begin with a letter or underscore and contain only letters, underscores, and numbers.`,
      });
    });
  });
});

describe('validateIndexPrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it ignores privilegs with no indices defined', () => {
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

  test('it requires privilges when an index is defined', () => {
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
