/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldText } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { User } from '../../../../common/model/user';
import { UserAPIClient } from '../../../lib/api';
import { ChangePasswordForm } from './change_password_form';

function getCurrentPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="currentPassword"]');
}

function getNewPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="newPassword"]');
}

function getConfirmPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="confirmNewPassword"]');
}

jest.mock('ui/kfetch');

describe('<ChangePasswordForm>', () => {
  describe('for the current user', () => {
    it('shows fields for current and new passwords', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          apiClient={new UserAPIClient()}
        />
      );

      expect(getCurrentPasswordField(wrapper)).toHaveLength(1);
      expect(getNewPasswordField(wrapper)).toHaveLength(1);
      expect(getConfirmPasswordField(wrapper)).toHaveLength(1);
    });

    it('allows a password to be changed', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const callback = jest.fn();

      const apiClient = new UserAPIClient();
      apiClient.changePassword = jest.fn();

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          onChangePassword={callback}
          apiClient={apiClient}
        />
      );

      const currentPassword = getCurrentPasswordField(wrapper);
      currentPassword.props().onChange!({ target: { value: 'myCurrentPassword' } } as any);

      const newPassword = getNewPasswordField(wrapper);
      newPassword.props().onChange!({ target: { value: 'myNewPassword' } } as any);

      const confirmPassword = getConfirmPasswordField(wrapper);
      confirmPassword.props().onChange!({ target: { value: 'myNewPassword' } } as any);

      wrapper.find('button[data-test-subj="changePasswordButton"]').simulate('click');

      expect(apiClient.changePassword).toHaveBeenCalledTimes(1);
      expect(apiClient.changePassword).toHaveBeenCalledWith(
        'user',
        'myNewPassword',
        'myCurrentPassword'
      );
    });
  });

  describe('for another user', () => {
    it('shows fields for new password only', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={false}
          apiClient={new UserAPIClient()}
        />
      );

      expect(getCurrentPasswordField(wrapper)).toHaveLength(0);
      expect(getNewPasswordField(wrapper)).toHaveLength(1);
      expect(getConfirmPasswordField(wrapper)).toHaveLength(1);
    });
  });
});
