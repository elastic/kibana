/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { RoleValidator } from '../../../lib/validate_role';
import { ClusterPrivileges } from './cluster_privileges';
import { ElasticsearchPrivileges } from './elasticsearch_privileges';
import { IndexPrivileges } from './index_privileges';

test('it renders without crashing', () => {
  const props = {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    builtinESPrivileges: {
      cluster: ['all', 'manage', 'monitor'],
      index: ['all', 'read', 'write', 'index'],
    },
  };
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders ClusterPrivileges', () => {
  const props = {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    builtinESPrivileges: {
      cluster: ['all', 'manage', 'monitor'],
      index: ['all', 'read', 'write', 'index'],
    },
  };
  const wrapper = mountWithIntl(<ElasticsearchPrivileges {...props} />);
  expect(wrapper.find(ClusterPrivileges)).toHaveLength(1);
});

test('it renders IndexPrivileges', () => {
  const props = {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    builtinESPrivileges: {
      cluster: ['all', 'manage', 'monitor'],
      index: ['all', 'read', 'write', 'index'],
    },
  };
  const wrapper = mountWithIntl(<ElasticsearchPrivileges {...props} />);
  expect(wrapper.find(IndexPrivileges)).toHaveLength(1);
});
