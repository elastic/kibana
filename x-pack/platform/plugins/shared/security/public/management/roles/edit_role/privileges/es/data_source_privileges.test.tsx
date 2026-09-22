/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { DataSourcePrivileges } from './data_source_privileges';
import type { Role } from '../../../../../../common';
import { RoleValidator } from '../../validate_role';

type RoleOverrides = Partial<Omit<Role, 'elasticsearch'>> & {
  elasticsearch?: Partial<Role['elasticsearch']>;
};

const createRole = (overrides: RoleOverrides): Role => {
  const esOverrides = overrides.elasticsearch ?? {};
  const {
    cluster,
    indices,
    run_as: runAs,
    ...restEsOverrides
  } = esOverrides as Partial<Role['elasticsearch']>;
  const { elasticsearch: _ignoredEs, ...restOverrides } = overrides;
  const elasticsearch = {
    ...restEsOverrides,
    cluster: cluster ?? [],
    indices: indices ?? [],
    run_as: runAs ?? [],
  } as any as Role['elasticsearch'];
  return {
    name: 'my-role',
    elasticsearch,
    kibana: [],
    ...restOverrides,
  };
};

describe('DataSourcePrivileges', () => {
  const baseProps = {
    indexPatterns: [],
    validator: new RoleValidator(),
    onAdd: jest.fn(),
    onChange: jest.fn(),
    editable: true,
  };

  beforeEach(() => {
    baseProps.onAdd.mockClear();
    baseProps.onChange.mockClear();
  });

  test('calls onAdd when add button clicked', () => {
    const role = createRole({});
    const wrapper = shallowWithIntl(<DataSourcePrivileges {...baseProps} role={role} />);
    const onClick = wrapper.find('EuiButton').prop('onClick') as unknown as
      | ((event?: unknown) => void)
      | undefined;
    expect(onClick).toBeDefined();
    onClick?.({});
    expect(baseProps.onAdd).toHaveBeenCalledTimes(1);
  });

  test('updates global.data_source', () => {
    const role = createRole({
      elasticsearch: {
        global: {
          application: { manage: { applications: [] } },
          data_source: [
            {
              names: ['acme_*'],
              privileges: ['read'],
            },
          ],
        },
      },
    });

    const wrapper = shallowWithIntl(<DataSourcePrivileges {...baseProps} role={role} />);
    const form = wrapper.find('DataSourcePrivilegeForm').at(0);
    const onFormChange = form.prop('onChange') as unknown as (p: unknown) => void;
    onFormChange({
      names: ['acme_*'],
      privileges: ['manage'],
    } as any);

    expect(baseProps.onChange).toHaveBeenCalledTimes(1);
    expect(baseProps.onChange).toHaveBeenCalledWith({
      ...role,
      elasticsearch: {
        ...role.elasticsearch,
        global: {
          ...(role.elasticsearch.global as any),
          data_source: [
            {
              names: ['acme_*'],
              privileges: ['manage'],
            },
          ],
        },
      },
    });
  });

  test('deletes global.data_source entry', () => {
    const role = createRole({
      elasticsearch: {
        global: {
          application: { manage: { applications: [] } },
          data_source: [
            { names: ['a*'], privileges: ['read'] },
            { names: ['b*'], privileges: ['manage'] },
          ],
        },
      },
    });

    const wrapper = shallowWithIntl(<DataSourcePrivileges {...baseProps} role={role} />);
    const onDelete = wrapper
      .find('DataSourcePrivilegeForm')
      .at(0)
      .prop('onDelete') as unknown as () => void;
    onDelete();

    expect(baseProps.onChange).toHaveBeenCalledTimes(1);
    expect(baseProps.onChange).toHaveBeenCalledWith({
      ...role,
      elasticsearch: {
        ...role.elasticsearch,
        global: {
          ...(role.elasticsearch.global as any),
          data_source: [{ names: ['b*'], privileges: ['manage'] }],
        },
      },
    });
  });
});
