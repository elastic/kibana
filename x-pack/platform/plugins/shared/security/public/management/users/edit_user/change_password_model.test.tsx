/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';

import type { ChangePasswordFormValues } from './change_password_modal';
import { ChangePasswordModal, validateChangePasswordForm } from './change_password_modal';
import * as currentUserModule from '../../../components/use_current_user';
import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';

describe('ChangePasswordModal', () => {
  describe('#validateChangePasswordForm', () => {
    describe('for current user', () => {
      it('should show an error when it is current user with no current password', () => {
        expect(
          validateChangePasswordForm({ password: 'changeme', confirm_password: 'changeme' }, true)
        ).toMatchInlineSnapshot(`
                  Object {
                    "current_password": "Enter your current password.",
                  }
              `);
      });

      it('should show errors when there is no new password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: undefined,
              confirm_password: 'changeme',
            } as unknown as ChangePasswordFormValues,
            true
          )
        ).toMatchInlineSnapshot(`
          Object {
            "current_password": "Enter your current password.",
            "password": "Enter a new password.",
          }
        `);
      });

      it('should show errors when the new password is not at least 6 characters', () => {
        expect(validateChangePasswordForm({ password: '12345', confirm_password: '12345' }, true))
          .toMatchInlineSnapshot(`
          Object {
            "current_password": "Enter your current password.",
            "password": "Enter at least 6 characters.",
          }
        `);
      });

      it('should show errors when new password does not match confirmation password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'notTheSame',
            },
            true
          )
        ).toMatchInlineSnapshot(`
                  Object {
                    "confirm_password": "Passwords do not match.",
                    "current_password": "Enter your current password.",
                  }
              `);
      });

      it('should show NO errors', () => {
        expect(
          validateChangePasswordForm(
            {
              current_password: 'oldpassword',
              password: 'changeme',
              confirm_password: 'changeme',
            },
            true
          )
        ).toMatchInlineSnapshot(`Object {}`);
      });
    });

    describe('for another user', () => {
      it('should show errors when there is no new password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: undefined,
              confirm_password: 'changeme',
            } as unknown as ChangePasswordFormValues,
            false
          )
        ).toMatchInlineSnapshot(`
          Object {
            "password": "Enter a new password.",
          }
        `);
      });

      it('should show errors when the new password is not at least 6 characters', () => {
        expect(validateChangePasswordForm({ password: '1234', confirm_password: '1234' }, false))
          .toMatchInlineSnapshot(`
          Object {
            "password": "Enter at least 6 characters.",
          }
        `);
      });

      it('should show errors when new password does not match confirmation password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'notTheSame',
            },
            false
          )
        ).toMatchInlineSnapshot(`
          Object {
            "confirm_password": "Passwords do not match.",
          }
        `);
      });

      it('should show NO errors', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'changeme',
            },
            false
          )
        ).toMatchInlineSnapshot(`Object {}`);
      });
    });
  });

  describe('render', () => {
    const coreStart = coreMock.createStart();
    const authc = securityMock.createSetup().authc;
    const history = createMemoryHistory({ initialEntries: ['/users'] });
    const onCancelMock = jest.fn();
    const onSuccessMock = jest.fn();

    const renderChangePasswordModal = (
      username: string,
      defaultValues?: ChangePasswordFormValues
    ) => {
      return render(
        coreStart.rendering.addContext(
          <Providers services={coreStart} authc={authc} history={history}>
            <ChangePasswordModal
              username={username}
              defaultValues={defaultValues}
              onCancel={onCancelMock}
              onSuccess={onSuccessMock}
            />
          </Providers>
        )
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock useCurrentUser to return a consistent state
      jest.spyOn(currentUserModule, 'useCurrentUser').mockReturnValue({
        loading: false,
        value: undefined,
        error: undefined,
      });
    });

    it('renders password fields for non-current user', () => {
      renderChangePasswordModal('otheruser');

      // Should not show current password field
      expect(
        screen.queryByTestId('editUserChangePasswordCurrentPasswordInput')
      ).not.toBeInTheDocument();

      // Should show new password and confirm password fields
      expect(screen.getByTestId('editUserChangePasswordNewPasswordInput')).toBeInTheDocument();
      expect(screen.getByTestId('editUserChangePasswordConfirmPasswordInput')).toBeInTheDocument();

      // Should show username display
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });

    it('renders system user warning for kibana user', () => {
      renderChangePasswordModal('kibana');

      expect(screen.getByText('Kibana will lose connection to Elasticsearch')).toBeInTheDocument();
      expect(
        screen.getByText(/After changing the password for the kibana user/)
      ).toBeInTheDocument();
    });

    it('renders system user warning for kibana_system user', () => {
      renderChangePasswordModal('kibana_system');

      expect(screen.getByText('Kibana will lose connection to Elasticsearch')).toBeInTheDocument();
      expect(
        screen.getByText(/After changing the password for the kibana_system user/)
      ).toBeInTheDocument();
    });

    it('renders cancel and submit buttons', () => {
      renderChangePasswordModal('testuser');

      expect(screen.getByTestId('changePasswordFormCancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('changePasswordFormSubmitButton')).toBeInTheDocument();
    });

    it('disables submit button when password is empty', () => {
      renderChangePasswordModal('testuser');

      const submitButton = screen.getByTestId('changePasswordFormSubmitButton');
      expect(submitButton).toBeDisabled();
    });

    it('keeps submit button disabled when password is too short', async () => {
      const user = userEvent.setup();
      const { unmount } = renderChangePasswordModal('testuser');

      const submitButton = screen.getByTestId('changePasswordFormSubmitButton');
      expect(submitButton).toBeDisabled();

      const newPasswordInput = screen.getByTestId('editUserChangePasswordNewPasswordInput');
      const confirmPasswordInput = screen.getByTestId('editUserChangePasswordConfirmPasswordInput');

      await user.type(newPasswordInput, 'noway');
      await user.type(confirmPasswordInput, 'noway');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await waitFor(() => {
        expect(screen.getByTestId('changePasswordFormSubmitButton')).toBeDisabled();
      });

      unmount();
    });

    it('enables submit button when valid password is entered', async () => {
      const user = userEvent.setup();
      const { unmount } = renderChangePasswordModal('testuser');

      const submitButton = screen.getByTestId('changePasswordFormSubmitButton');
      expect(submitButton).toBeDisabled();

      const newPasswordInput = screen.getByTestId('editUserChangePasswordNewPasswordInput');
      const confirmPasswordInput = screen.getByTestId('editUserChangePasswordConfirmPasswordInput');

      await user.type(newPasswordInput, 'Valid1');
      await user.type(confirmPasswordInput, 'Valid1');

      await waitFor(() => {
        expect(screen.getByTestId('changePasswordFormSubmitButton')).toBeEnabled();
      });

      unmount();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const { unmount } = renderChangePasswordModal('testuser');

      const cancelButton = screen.getByTestId('changePasswordFormCancelButton');
      await user.click(cancelButton);

      expect(onCancelMock).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('calls onSuccess when submit button is clicked', async () => {
      const user = userEvent.setup();
      const { unmount } = renderChangePasswordModal('testuser');

      const newPasswordInput = screen.getByTestId('editUserChangePasswordNewPasswordInput');
      const confirmPasswordInput = screen.getByTestId('editUserChangePasswordConfirmPasswordInput');

      await user.type(newPasswordInput, 'Valid1');
      await user.type(confirmPasswordInput, 'Valid1');

      await waitFor(() => {
        expect(screen.getByTestId('changePasswordFormSubmitButton')).toBeEnabled();
      });

      const submitButton = screen.getByTestId('changePasswordFormSubmitButton');
      await user.click(submitButton);

      expect(onSuccessMock).toHaveBeenCalledTimes(1);

      unmount();
    });
  });
});
