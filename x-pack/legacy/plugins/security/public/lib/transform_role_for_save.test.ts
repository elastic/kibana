/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../common/model';
import { transformRoleForSave } from './transform_role_for_save';

describe('transformRoleForSave', () => {
  describe('spaces disabled', () => {
    it('removes placeholder index privileges', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: [], privileges: [] }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('removes placeholder query entries', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: '' }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'] }],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('removes transient fields not required for save', () => {
      const role: Role = {
        name: 'my role',
        transient_metadata: {
          foo: 'bar',
        },
        _transform_error: ['kibana'],
        metadata: {
          someOtherMetadata: true,
        },
        _unrecognized_applications: ['foo'],
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        metadata: {
          someOtherMetadata: true,
        },
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('does not remove actual query entries', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('should remove feature privileges if a corresponding base privilege is defined', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
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
      });
    });

    it('should not remove feature privileges if a corresponding base privilege is not defined', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      });
    });

    it('should remove space privileges', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, false);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      });
    });
  });

  describe('spaces enabled', () => {
    it('removes placeholder index privileges', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: [], privileges: [] }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('removes placeholder query entries', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: '' }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'] }],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('removes transient fields not required for save', () => {
      const role: Role = {
        name: 'my role',
        transient_metadata: {
          foo: 'bar',
        },
        _transform_error: ['kibana'],
        metadata: {
          someOtherMetadata: true,
        },
        _unrecognized_applications: ['foo'],
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        metadata: {
          someOtherMetadata: true,
        },
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('does not remove actual query entries', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
          run_as: [],
        },
        kibana: [],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
          run_as: [],
        },
        kibana: [],
      });
    });

    it('should remove feature privileges if a corresponding base privilege is defined', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['foo'],
            base: ['all'],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['foo'],
            base: ['all'],
            feature: {},
          },
        ],
      });
    });

    it('should not remove feature privileges if a corresponding base privilege is not defined', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['foo'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['foo'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      });
    });

    it('should not remove space privileges', () => {
      const role: Role = {
        name: 'my role',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      };

      const result = transformRoleForSave(role, true);

      expect(result).toEqual({
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
          {
            spaces: ['marketing'],
            base: [],
            feature: {
              feature1: ['read'],
              feature2: ['write'],
            },
          },
        ],
      });
    });
  });
});
