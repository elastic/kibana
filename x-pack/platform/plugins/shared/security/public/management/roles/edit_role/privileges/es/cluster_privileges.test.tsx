/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';

import { ClusterPrivileges } from './cluster_privileges';
import type { Role } from '../../../../../../common';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiComboBox: jest.fn((props: any) => <actual.EuiComboBox {...props} />),
  };
});

const MockedEuiComboBox = EuiComboBox as unknown as jest.Mock;

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

test('it renders without crashing', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      remote_cluster: [],
      cluster: [],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  const { container } = renderWithIntl(
    <ClusterPrivileges
      role={role}
      onChange={jest.fn()}
      builtinClusterPrivileges={['all', 'manage', 'monitor']}
    />
  );
  expect(container.children[0]).toMatchSnapshot();
});

test('it renders fields as disabled when not editable', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      cluster: [],
      remote_cluster: [],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  MockedEuiComboBox.mockClear();
  renderWithIntl(
    <ClusterPrivileges
      role={role}
      onChange={jest.fn()}
      builtinClusterPrivileges={['all', 'manage', 'monitor']}
      editable={false}
    />
  );
  expect(MockedEuiComboBox).toHaveBeenCalledWith(
    expect.objectContaining({ isDisabled: true }),
    expect.anything()
  );
});

test('it allows for custom cluster privileges', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      cluster: ['existing-custom', 'monitor'],
      remote_cluster: [],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  const onChange = jest.fn();
  renderWithIntl(
    <ClusterPrivileges
      role={role}
      onChange={onChange}
      builtinClusterPrivileges={['all', 'manage', 'monitor']}
    />
  );

  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'custom-cluster-privilege' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

  expect(onChange).toHaveBeenCalledWith(['existing-custom', 'monitor', 'custom-cluster-privilege']);
});
