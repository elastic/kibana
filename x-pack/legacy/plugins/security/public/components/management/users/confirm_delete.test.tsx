/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ConfirmDeleteUsers } from './confirm_delete';
import React from 'react';
import { UserAPIClient } from '../../../lib/api';

jest.mock('ui/kfetch');

describe('ConfirmDeleteUsers', () => {
  it('renders a warning for a single user', () => {
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers apiClient={null as any} usersToDelete={['foo']} onCancel={jest.fn()} />
    );

    expect(wrapper.find('EuiModalHeaderTitle').text()).toMatchInlineSnapshot(`"Delete user foo"`);
  });

  it('renders a warning for a multiple users', () => {
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        apiClient={null as any}
        usersToDelete={['foo', 'bar', 'baz']}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find('EuiModalHeaderTitle').text()).toMatchInlineSnapshot(`"Delete 3 users"`);
  });

  it('fires onCancel when the operation is cancelled', () => {
    const onCancel = jest.fn();
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers apiClient={null as any} usersToDelete={['foo']} onCancel={onCancel} />
    );

    expect(onCancel).toBeCalledTimes(0);

    wrapper.find('EuiButtonEmpty[data-test-subj="confirmModalCancelButton"]').simulate('click');

    expect(onCancel).toBeCalledTimes(1);
  });

  it('deletes the requested users when confirmed', () => {
    const onCancel = jest.fn();
    const deleteUser = jest.fn();

    const apiClient = new UserAPIClient();
    apiClient.deleteUser = deleteUser;

    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        usersToDelete={['foo', 'bar']}
        apiClient={apiClient}
        onCancel={onCancel}
      />
    );

    wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    expect(deleteUser).toBeCalledTimes(2);
    expect(deleteUser).toBeCalledWith('foo');
    expect(deleteUser).toBeCalledWith('bar');
  });

  it('attempts to delete all users even if some fail', () => {
    const onCancel = jest.fn();
    const deleteUser = jest.fn().mockImplementation(user => {
      if (user === 'foo') {
        return Promise.reject('something terrible happened');
      }
      return Promise.resolve();
    });

    const apiClient = new UserAPIClient();
    apiClient.deleteUser = deleteUser;

    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        usersToDelete={['foo', 'bar']}
        apiClient={apiClient}
        onCancel={onCancel}
      />
    );

    wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    expect(deleteUser).toBeCalledTimes(2);
    expect(deleteUser).toBeCalledWith('foo');
    expect(deleteUser).toBeCalledWith('bar');
  });
});
