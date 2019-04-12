/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { UserProfileProvider } from '../../../xpack_main/public/services/user_profile';
import { ManageSpacesButton } from './manage_spaces_button';

const buildUserProfile = (canManageSpaces: boolean) => {
  return UserProfileProvider({ manageSpaces: canManageSpaces });
};

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(true)} />;
    expect(shallowWithIntl(component)).toMatchSnapshot();
  });

  it(`doesn't render if user profile forbids managing spaces`, () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(false)} />;
    expect(shallowWithIntl(component)).toMatchSnapshot();
  });
});
