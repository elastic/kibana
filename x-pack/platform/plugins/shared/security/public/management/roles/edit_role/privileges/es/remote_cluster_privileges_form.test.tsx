/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import type { EuiComboBoxProps } from '@elastic/eui';
import React from 'react';

import '@kbn/code-editor-mock/jest_helper';
import type { RemoteClusterPrivilege } from '@kbn/security-plugin-types-common';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { RemoteClusterPrivilegesForm } from './remote_cluster_privileges_form';
import { RoleValidator } from '../../validate_role';

test('it renders without crashing', () => {
  const wrapper = shallowWithIntl(
    <RemoteClusterPrivilegesForm
      remoteClusterPrivilege={{
        clusters: ['cluster1'],
        privileges: ['monitor_enrich'],
      }}
      formIndex={0}
      availableRemoteClusterPrivileges={['monitor_enrich']}
      isRoleReadOnly={false}
      validator={new RoleValidator()}
      onChange={jest.fn()}
      onDelete={jest.fn()}
    />
  );
  expect(wrapper).toMatchSnapshot();
});

test('it allows for custom remote cluster input', () => {
  const onChange = jest.fn();
  const wrapper = mountWithIntl(
    <RemoteClusterPrivilegesForm
      remoteClusterPrivilege={{
        clusters: ['cluster1'],
        privileges: ['monitor_enrich'],
      }}
      formIndex={0}
      availableRemoteClusterPrivileges={['monitor_enrich']}
      isRoleReadOnly={false}
      validator={new RoleValidator()}
      onChange={onChange}
      onDelete={jest.fn()}
    />
  );

  const privilegesSelect = wrapper.find(
    'EuiComboBox[data-test-subj="remoteClusterClustersInput0"]'
  );

  (privilegesSelect.props() as any).onCreateOption('custom-cluster');

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ clusters: ['cluster1', 'custom-cluster'] })
  );
});

test('it does not allow for custom remote cluster privileges', () => {
  const onChange = jest.fn();
  const wrapper = mountWithIntl(
    <RemoteClusterPrivilegesForm
      remoteClusterPrivilege={{
        clusters: ['cluster1'],
        privileges: ['monitor_enrich'],
      }}
      formIndex={0}
      availableRemoteClusterPrivileges={['monitor_enrich']}
      isRoleReadOnly={false}
      validator={new RoleValidator()}
      onChange={onChange}
      onDelete={jest.fn()}
    />
  );

  const privilegesSelect = wrapper.find(
    'EuiComboBox[data-test-subj="remoteClusterPrivilegesInput0"]'
  );

  expect((privilegesSelect.props() as EuiComboBoxProps<unknown>).onCreateOption).toBe(undefined);
});

test('it allows for custom remote cluster clusters input', () => {
  const onChange = jest.fn();
  const wrapper = mountWithIntl(
    <RemoteClusterPrivilegesForm
      remoteClusterPrivilege={{
        clusters: ['cluster1'],
        privileges: ['monitor_enrich'],
      }}
      formIndex={0}
      availableRemoteClusterPrivileges={['monitor_enrich']}
      isRoleReadOnly={false}
      validator={new RoleValidator()}
      onChange={onChange}
      onDelete={jest.fn()}
    />
  );

  const clustersSelect = wrapper.find('EuiComboBox[data-test-subj="remoteClusterClustersInput0"]');

  (clustersSelect.props() as any).onCreateOption('cluster2');

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ clusters: ['cluster1', 'cluster2'] })
  );
});

test('it renders fields as disabled when isRoleReadOnly is true', () => {
  const onChange = jest.fn();
  const wrapper = mountWithIntl(
    <RemoteClusterPrivilegesForm
      remoteClusterPrivilege={{
        clusters: ['cluster1'],
        privileges: ['monitor_enrich'],
      }}
      formIndex={0}
      availableRemoteClusterPrivileges={['monitor_enrich']}
      isRoleReadOnly={true}
      validator={new RoleValidator()}
      onChange={onChange}
      onDelete={jest.fn()}
    />
  );

  const privilegesSelect = wrapper.find(
    'EuiComboBox[data-test-subj="remoteClusterPrivilegesInput0"]'
  );
  expect(privilegesSelect.prop('isDisabled')).toBe(true);

  const clustersSelect = wrapper.find('EuiComboBox[data-test-subj="remoteClusterClustersInput0"]');
  expect(clustersSelect.prop('isDisabled')).toBe(true);
});

describe('delete button', () => {
  const props = {
    remoteClusterPrivilege: {
      clusters: ['cluster1'],
      privileges: ['monitor_enrich'] as RemoteClusterPrivilege[],
    },
    formIndex: 0,
    availableRemoteClusterPrivileges: ['monitor_enrich'],
    isRoleReadOnly: false,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test('it is hidden when isRoleReadOnly is true', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: true,
    };
    const wrapper = mountWithIntl(<RemoteClusterPrivilegesForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  test('it is shown when isRoleReadOnly is false', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: false,
    };
    const wrapper = mountWithIntl(<RemoteClusterPrivilegesForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);
  });

  test('it invokes onDelete when clicked', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: false,
    };
    const wrapper = mountWithIntl(<RemoteClusterPrivilegesForm {...testProps} />);
    wrapper.find(EuiButtonIcon).simulate('click');
    expect(testProps.onDelete).toHaveBeenCalledTimes(1);
  });
});
