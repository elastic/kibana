/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiConfirmModal } from '@elastic/eui';
import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';

import { mountWithIntl, renderWithI18n, shallowWithIntl } from '@kbn/test-jest-helpers';

import { DeleteRoleButton } from './delete_role_button';

test('it renders without crashing', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallowWithIntl(
    <DeleteRoleButton canDelete={true} onDelete={deleteHandler} roleName="Test Role " />
  );
  expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it shows a confirmation dialog when clicked', () => {
  const deleteHandler = jest.fn();
  const wrapper = mountWithIntl(
    <DeleteRoleButton canDelete={true} onDelete={deleteHandler} roleName="Test Role " />
  );

  wrapper.find(EuiButtonEmpty).simulate('click');

  expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);

  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it renders nothing when canDelete is false', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallowWithIntl(
    <DeleteRoleButton canDelete={false} onDelete={deleteHandler} roleName="Test Role " />
  );
  expect(wrapper.find('*')).toHaveLength(0);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it warns about the service accounts holding the role in the confirmation', () => {
  renderWithI18n(
    <DeleteRoleButton
      canDelete={true}
      onDelete={jest.fn()}
      roleName="Test Role"
      serviceAccountRoleUsage={{
        usage: {
          status: 'loaded',
          serviceAccounts: [
            { id: 'kibana/relay', name: 'relay', roles: ['Test Role'], enabled: true },
          ],
          complete: true,
        },
        serviceAccounts: { listWorkloads: jest.fn() },
      }}
    />
  );

  fireEvent.click(screen.getByText('Delete role'));

  // Scoped to the callout: the enzyme tests above leave their modals mounted.
  const callout = screen.getByTestId('serviceAccountRoleUsageCallout');
  expect(callout).toHaveTextContent('1 service account uses this role');
  expect(within(callout).getByText('relay')).toBeInTheDocument();
});

test('it leaves the confirmation as is when no service accounts hold the role', () => {
  renderWithI18n(
    <DeleteRoleButton
      canDelete={true}
      onDelete={jest.fn()}
      roleName="Test Role"
      serviceAccountRoleUsage={{
        usage: { status: 'loaded', serviceAccounts: [], complete: true },
        serviceAccounts: { listWorkloads: jest.fn() },
      }}
    />
  );

  fireEvent.click(screen.getByText('Delete role'));

  expect(screen.queryByTestId('serviceAccountRoleUsageCallout')).not.toBeInTheDocument();
});
