/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { UserList } from './user_list';
import * as i18n from '../translations';
import { basicCase } from '../../../containers/mock';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import { userProfilesMap } from '../../../containers/user_profiles/api.mock';

jest.mock('../../../common/navigation/hooks');

const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

// FLAKY: https://github.com/elastic/kibana/issues/192640
describe.skip('UserList ', () => {
  const title = basicCase.title;
  const caseLink = 'https://example.com/cases/test';
  const user = {
    email: 'case_all@elastic.co',
    fullName: 'Cases',
    username: 'cases_all',
  };

  const open = jest.fn();
  const getCaseViewUrl = jest.fn().mockReturnValue(caseLink);
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl });
    window.open = open;
  });

  it('triggers mailto when email icon clicked', async () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user: { ...user, full_name: user.fullName },
          },
        ]}
      />
    );

    await userEvent.click(screen.getByTestId('user-list-email-button'));

    expect(open).toBeCalledWith(
      `mailto:${user.email}?subject=${i18n.EMAIL_SUBJECT(title)}&body=${i18n.EMAIL_BODY(caseLink)}`,
      '_blank'
    );
  });

  it('sort the users correctly', () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user: { ...user, username: 'test', full_name: null, email: null },
          },
          {
            user: { ...user, full_name: 'Cases' },
          },
          {
            user: { ...user, username: 'elastic', email: 'elastic@elastic.co', full_name: null },
          },
        ]}
      />
    );

    const users = screen.getAllByTestId('user-profile-username');

    expect(users[0].textContent).toBe('Cases');
    expect(users[1].textContent).toBe('elastic@elastic.co');
    expect(users[2].textContent).toBe('test');
  });

  it('return null if no users', () => {
    const result = appMockRender.render(
      <UserList theCase={basicCase} headline={i18n.REPORTER} users={[]} />
    );

    expect(result.container).toBeEmptyDOMElement();
  });

  it('shows the loading spinner if loading', () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        users={[
          {
            user: { ...user, full_name: user.fullName },
          },
        ]}
        loading={true}
      />
    );

    expect(screen.getByTestId('users-list-loading-spinner')).toBeEmptyDOMElement();
  });

  it('should render users with user profiles correctly', () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        userProfiles={userProfilesMap}
        users={[
          {
            user: {
              username: null,
              email: null,
              full_name: null,
            },
            uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          },
        ]}
      />
    );

    const userElement = screen.getByTestId('user-profile-username');
    expect(userElement.textContent).toBe('Damaged Raccoon');
  });

  it('should not render invalid users', () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        userProfiles={userProfilesMap}
        users={[
          {
            user: {
              username: null,
              email: null,
              full_name: null,
              // @ts-expect-error upgrade typescript v4.9.5
              uid: null,
            },
          },
          {
            user: {
              username: 'damaged_raccoon',
              email: 'damaged_raccoon@elastic.co',
              full_name: 'Damaged Raccoon',
            },
            uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          },
        ]}
      />
    );

    const users = screen.getAllByTestId('user-profile-username');

    expect(users.length).toBe(1);
    expect(users[0].textContent).toBe('Damaged Raccoon');
  });

  it('should render Unknown users correctly', () => {
    appMockRender.render(
      <UserList
        theCase={basicCase}
        headline={i18n.REPORTER}
        userProfiles={userProfilesMap}
        users={[
          {
            user: {
              username: null,
              email: null,
              full_name: null,
            },
            uid: 'not-exist',
          },
        ]}
      />
    );

    expect(screen.getByTestId('user-profile-username').textContent).toBe('Unknown');
  });
});
