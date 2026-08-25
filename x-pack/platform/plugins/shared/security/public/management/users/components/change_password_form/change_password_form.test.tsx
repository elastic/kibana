/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { ChangePasswordForm } from './change_password_form';
import type { User } from '../../../../../common';
import { userAPIClientMock } from '../../index.mock';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

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

      renderWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          userAPIClient={userAPIClientMock.create()}
          notifications={coreMock.createStart().notifications}
        />
      );

      expect(screen.getByTestId('currentPassword')).toBeInTheDocument();
      expect(screen.getByTestId('newPassword')).toBeInTheDocument();
      expect(screen.getByTestId('confirmNewPassword')).toBeInTheDocument();
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

      const apiClientMock = userAPIClientMock.create();

      renderWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          onChangePassword={callback}
          userAPIClient={apiClientMock}
          notifications={coreMock.createStart().notifications}
        />
      );

      fireEvent.change(screen.getByTestId('currentPassword'), {
        target: { value: 'myCurrentPassword' },
      });

      fireEvent.change(screen.getByTestId('newPassword'), {
        target: { value: 'myNewPassword' },
      });

      fireEvent.change(screen.getByTestId('confirmNewPassword'), {
        target: { value: 'myNewPassword' },
      });

      fireEvent.click(screen.getByTestId('changePasswordButton'));

      expect(apiClientMock.changePassword).toHaveBeenCalledTimes(1);
      expect(apiClientMock.changePassword).toHaveBeenCalledWith(
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

      renderWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={false}
          userAPIClient={userAPIClientMock.create()}
          notifications={coreMock.createStart().notifications}
        />
      );

      expect(screen.queryByTestId('currentPassword')).not.toBeInTheDocument();
      expect(screen.getByTestId('newPassword')).toBeInTheDocument();
      expect(screen.getByTestId('confirmNewPassword')).toBeInTheDocument();
    });
  });
});
