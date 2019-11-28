/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { EditUserPage } from './edit_user_page';
import React from 'react';
import { UserAPIClient } from '../../../../lib/api';
import { User, Role } from '../../../../../common/model';
import { ReactWrapper } from 'enzyme';

jest.mock('ui/kfetch');

const buildClient = () => {
  const apiClient = new UserAPIClient();

  const createUser = (username: string) => {
    const user: User = {
      username,
      full_name: 'my full name',
      email: 'foo@bar.com',
      roles: ['idk', 'something'],
      enabled: true,
    };

    if (username === 'reserved_user') {
      user.metadata = {
        _reserved: true,
      };
    }

    return Promise.resolve(user);
  };

  apiClient.getUser = jest.fn().mockImplementation(createUser);
  apiClient.getCurrentUser = jest.fn().mockImplementation(() => createUser('current_user'));

  apiClient.getRoles = jest.fn().mockImplementation(() => {
    return Promise.resolve([
      {
        name: 'role 1',
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: [],
        },
        kibana: [],
      },
      {
        name: 'role 2',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: ['bar'],
        },
        kibana: [],
      },
    ] as Role[]);
  });

  return apiClient;
};

function expectSaveButton(wrapper: ReactWrapper<any, any>) {
  expect(wrapper.find('EuiButton[data-test-subj="userFormSaveButton"]')).toHaveLength(1);
}

function expectMissingSaveButton(wrapper: ReactWrapper<any, any>) {
  expect(wrapper.find('EuiButton[data-test-subj="userFormSaveButton"]')).toHaveLength(0);
}

describe('EditUserPage', () => {
  it('allows reserved users to be viewed', async () => {
    const apiClient = buildClient();
    const wrapper = mountWithIntl(
      <EditUserPage.WrappedComponent
        username={'reserved_user'}
        apiClient={apiClient}
        changeUrl={path => path}
        intl={null as any}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(1);
    expect(apiClient.getCurrentUser).toBeCalledTimes(1);

    expectMissingSaveButton(wrapper);
  });

  it('allows new users to be created', async () => {
    const apiClient = buildClient();
    const wrapper = mountWithIntl(
      <EditUserPage.WrappedComponent
        username={''}
        apiClient={apiClient}
        changeUrl={path => path}
        intl={null as any}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(0);
    expect(apiClient.getCurrentUser).toBeCalledTimes(0);

    expectSaveButton(wrapper);
  });

  it('allows existing users to be edited', async () => {
    const apiClient = buildClient();
    const wrapper = mountWithIntl(
      <EditUserPage.WrappedComponent
        username={'existing_user'}
        apiClient={apiClient}
        changeUrl={path => path}
        intl={null as any}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(1);
    expect(apiClient.getCurrentUser).toBeCalledTimes(1);

    expectSaveButton(wrapper);
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
