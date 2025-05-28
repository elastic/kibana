/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';

import type { UserFormProps, UserFormValues } from './user_form';
import { UserForm } from './user_form';
import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';

const userMock: UserFormValues = {
  username: 'jdoe',
  full_name: '',
  email: '',
  roles: ['superuser'],
};

describe('UserForm', () => {
  const coreStart = coreMock.createStart();
  const authc = securityMock.createSetup().authc;
  const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });

  const onCancelMock = jest.fn();
  const onSuccessMock = jest.fn();

  let defaultProps: UserFormProps;

  beforeEach(() => {
    defaultProps = {
      isNewUser: true,
      isReservedUser: false,
      isCurrentUser: false,
      defaultValues: userMock,
      onCancel: onCancelMock,
      onSuccess: onSuccessMock,
      disabled: false,
    };
  });

  const renderUserForm = (props: Partial<UserFormProps> = {}) => {
    return render(
      coreStart.rendering.addContext(
        <Providers services={coreStart} authc={authc} history={history}>
          <UserForm {...defaultProps} {...props} />
        </Providers>
      )
    );
  };

  it('prevents editing username when disabled', async () => {
    // See https://github.com/elastic/kibana/issues/204268

    renderUserForm({ disabled: true });
    const usernameInput = screen.getByTestId<HTMLInputElement>('userFormUserNameInput');
    fireEvent.change(usernameInput, { target: { value: 'foo' } });
    expect(usernameInput.value).toBe('jdoe');
  });
});
