/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { AccountManagementPage } from './account_management_page';

jest.mock('ui/kfetch');

interface Options {
  withFullName?: boolean;
  withEmail?: boolean;
  realm?: string;
}
const createUser = ({ withFullName = true, withEmail = true, realm = 'native' }: Options = {}) => {
  return {
    full_name: withFullName ? 'Casey Smith' : '',
    username: 'csmith',
    email: withEmail ? 'csmith@domain.com' : '',
    enabled: true,
    roles: [],
    authentication_realm: {
      type: realm,
      name: realm,
    },
    lookup_realm: {
      type: realm,
      name: realm,
    },
  };
};

describe('<AccountManagementPage>', () => {
  it(`displays users full name, username, and email address`, () => {
    const user = createUser();
    const wrapper = mountWithIntl(<AccountManagementPage user={user} />);
    expect(wrapper.find('EuiText[data-test-subj="userDisplayName"]').text()).toEqual(
      user.full_name
    );
    expect(wrapper.find('[data-test-subj="username"]').text()).toEqual(user.username);
    expect(wrapper.find('[data-test-subj="email"]').text()).toEqual(user.email);
  });

  it(`displays username when full_name is not provided`, () => {
    const user = createUser({ withFullName: false });
    const wrapper = mountWithIntl(<AccountManagementPage user={user} />);
    expect(wrapper.find('EuiText[data-test-subj="userDisplayName"]').text()).toEqual(user.username);
  });

  it(`displays a placeholder when no email address is provided`, () => {
    const user = createUser({ withEmail: false });
    const wrapper = mountWithIntl(<AccountManagementPage user={user} />);
    expect(wrapper.find('[data-test-subj="email"]').text()).toEqual('no email address');
  });

  it(`displays change password form for users in the native realm`, () => {
    const user = createUser();
    const wrapper = mountWithIntl(<AccountManagementPage user={user} />);
    expect(wrapper.find('EuiFieldText[data-test-subj="currentPassword"]')).toHaveLength(1);
    expect(wrapper.find('EuiFieldText[data-test-subj="newPassword"]')).toHaveLength(1);
  });

  it(`does not display change password form for users in the saml realm`, () => {
    const user = createUser({ realm: 'saml' });
    const wrapper = mountWithIntl(<AccountManagementPage user={user} />);
    expect(wrapper.find('EuiFieldText[data-test-subj="currentPassword"]')).toHaveLength(0);
    expect(wrapper.find('EuiFieldText[data-test-subj="newPassword"]')).toHaveLength(0);
  });
});
