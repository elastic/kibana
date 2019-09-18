/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Role } from '../../../../../../../common/model';
import { ClusterPrivileges } from './cluster_privileges';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

test('it renders without crashing', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      cluster: [],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  const wrapper = shallow(
    <ClusterPrivileges
      role={role}
      onChange={jest.fn()}
      builtinClusterPrivileges={['all', 'manage', 'monitor']}
    />
  );
  expect(wrapper).toMatchSnapshot();
});

test('it allows for custom cluster privileges', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      cluster: ['existing-custom', 'monitor'],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  const onChange = jest.fn();
  const wrapper = mountWithIntl(
    <ClusterPrivileges
      role={role}
      onChange={onChange}
      builtinClusterPrivileges={['all', 'manage', 'monitor']}
    />
  );

  const clusterPrivsSelect = wrapper.find(
    'EuiComboBox[data-test-subj="cluster-privileges-combobox"]'
  );

  (clusterPrivsSelect.props() as any).onCreateOption('custom-cluster-privilege');

  expect(onChange).toHaveBeenCalledWith(['existing-custom', 'monitor', 'custom-cluster-privilege']);
});
