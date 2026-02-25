/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';

import { I18nProvider } from '@kbn/i18n-react';

import { SecurityNavControl } from './nav_control_component';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { userProfileMock } from '../../common/model/user_profile.mock';
import * as UseCurrentUserImports from '../components/use_current_user';

jest.mock('../components/use_current_user');
jest.mock('react-use/lib/useObservable');

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiContextMenu: jest.fn((props: any) => <actual.EuiContextMenu {...props} />),
  };
});

const MockedEuiContextMenu = EuiContextMenu as unknown as jest.MockedFunction<
  typeof EuiContextMenu
>;

const useObservableMock = useObservable as jest.Mock;
const useUserProfileMock = jest.spyOn(UseCurrentUserImports, 'useUserProfile');
const useCurrentUserMock = jest.spyOn(UseCurrentUserImports, 'useCurrentUser');

const userProfileWithSecurity = userProfileMock.createWithSecurity();
const userProfile = {
  ...userProfileWithSecurity,
  user: {
    ...userProfileWithSecurity.user,
    authentication_provider: { type: 'basic', name: 'basic1' },
  },
};
const userMenuLinks$ = new BehaviorSubject([]);

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('SecurityNavControl', () => {
  beforeEach(() => {
    useUserProfileMock.mockReset();
    useUserProfileMock.mockReturnValue({
      loading: false,
      value: userProfile,
    });

    useCurrentUserMock.mockReset();
    useCurrentUserMock.mockReturnValue({
      loading: false,
      value: mockAuthenticatedUser(),
    });

    useObservableMock.mockReset();
    useObservableMock.mockImplementation(
      (observable: BehaviorSubject<any>, initialValue = {}) => observable.value ?? initialValue
    );

    MockedEuiContextMenu.mockClear();
  });

  it('should render an avatar when user profile has loaded', async () => {
    renderWithIntl(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />
    );

    expect(useUserProfileMock).toHaveBeenCalledTimes(1);
    expect(useCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('userMenuButton')).toBeInTheDocument();
    expect(screen.getByTestId('userMenuAvatar')).toBeInTheDocument();
  });

  it('should render a spinner while loading', () => {
    useUserProfileMock.mockReturnValue({
      loading: true,
    });
    useCurrentUserMock.mockReturnValue({
      loading: true,
    });

    renderWithIntl(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />
    );

    expect(useUserProfileMock).toHaveBeenCalledTimes(1);
    expect(useCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('userMenuButton')).toBeInTheDocument();
    expect(screen.queryByTestId('userMenuAvatar')).not.toBeInTheDocument();
  });

  it('should open popover when avatar is clicked', async () => {
    renderWithIntl(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />
    );

    fireEvent.click(screen.getByTestId('userMenuButton'));
    await waitFor(() => {
      expect(screen.getByTestId('logoutLink')).toBeInTheDocument();
    });
  });

  it('should not open popover while loading', () => {
    useUserProfileMock.mockReturnValue({
      loading: true,
    });
    useCurrentUserMock.mockReturnValue({
      loading: true,
    });

    renderWithIntl(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />
    );

    fireEvent.click(screen.getByTestId('userMenuButton'));
    expect(screen.queryByTestId('logoutLink')).not.toBeInTheDocument();
  });

  it('should render additional user menu links registered by other plugins and should render the default Edit Profile link as the first link when no custom profile link is provided', async () => {
    const DummyComponent = <div>Dummy Component</div>;

    renderWithIntl(
      <SecurityNavControl
        editProfileUrl="edit-profile-link"
        logoutUrl=""
        userMenuLinks$={
          new BehaviorSubject([
            { label: 'link1', href: 'path-to-link-1', iconType: 'empty', order: 1 },
            { label: 'link2', href: 'path-to-link-2', iconType: 'empty', order: 2 },
            { label: 'link3', href: 'path-to-link-3', iconType: 'empty', order: 3 },
            {
              label: 'dummyComponent',
              href: '',
              iconType: 'empty',
              order: 4,
              content: DummyComponent,
            },
          ])
        }
      />
    );

    fireEvent.click(screen.getByTestId('userMenuButton'));

    const lastCall = MockedEuiContextMenu.mock.calls.at(-1)!;
    expect(lastCall[0].panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "content": <ContextMenuContent
            closePopover={[Function]}
            items={
              Array [
                Object {
                  "data-test-subj": "profileLink",
                  "href": "edit-profile-link",
                  "icon": <EuiIcon
                    size="m"
                    type="user"
                  />,
                  "name": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Edit profile"
                    id="xpack.security.navControlComponent.editProfileLinkText"
                  />,
                  "onClick": [Function],
                },
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link1",
                  "href": "path-to-link-1",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link1",
                },
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link2",
                  "href": "path-to-link-2",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link2",
                },
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link3",
                  "href": "path-to-link-3",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link3",
                },
                Object {
                  "content": <div>
                    Dummy Component
                  </div>,
                  "data-test-subj": "userMenuLink__dummyComponent",
                  "href": "",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "dummyComponent",
                },
                Object {
                  "data-test-subj": "logoutLink",
                  "href": "",
                  "icon": <EuiIcon
                    size="m"
                    type="exit"
                  />,
                  "name": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Log out"
                    id="xpack.security.navControlComponent.logoutLinkText"
                  />,
                },
              ]
            }
          />,
          "id": 0,
          "title": "full name",
        },
      ]
    `);
  });

  it('should render custom profile link registered by other plugins and not render default Edit Profile link', async () => {
    renderWithIntl(
      <SecurityNavControl
        editProfileUrl="edit-profile-link"
        logoutUrl=""
        userMenuLinks$={
          new BehaviorSubject([
            { label: 'link1', href: 'path-to-link-1', iconType: 'empty', order: 1 },
            { label: 'link2', href: 'path-to-link-2', iconType: 'empty', order: 2 },
            {
              label: 'link3',
              href: 'path-to-link-3',
              iconType: 'empty',
              order: 3,
              setAsProfile: true,
            },
          ])
        }
      />
    );

    fireEvent.click(screen.getByTestId('userMenuButton'));

    const lastCall = MockedEuiContextMenu.mock.calls.at(-1)!;
    expect(lastCall[0].panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "content": <ContextMenuContent
            closePopover={[Function]}
            items={
              Array [
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link1",
                  "href": "path-to-link-1",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link1",
                },
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link2",
                  "href": "path-to-link-2",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link2",
                },
                Object {
                  "content": undefined,
                  "data-test-subj": "userMenuLink__link3",
                  "href": "path-to-link-3",
                  "icon": <EuiIcon
                    size="m"
                    type="empty"
                  />,
                  "name": "link3",
                },
                Object {
                  "data-test-subj": "logoutLink",
                  "href": "",
                  "icon": <EuiIcon
                    size="m"
                    type="exit"
                  />,
                  "name": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Log out"
                    id="xpack.security.navControlComponent.logoutLinkText"
                  />,
                },
              ]
            }
          />,
          "id": 0,
          "title": "full name",
        },
      ]
    `);
  });

  it('should render anonymous user', async () => {
    useUserProfileMock.mockReturnValue({
      loading: false,
      value: undefined,
      error: new Error('404'),
    });

    useCurrentUserMock.mockReturnValue({
      loading: false,
      value: mockAuthenticatedUser({
        authentication_provider: { type: 'anonymous', name: 'does no matter' },
      }),
    });

    renderWithIntl(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />
    );

    fireEvent.click(screen.getByTestId('userMenuButton'));

    const lastCall = MockedEuiContextMenu.mock.calls.at(-1)!;
    expect(lastCall[0].panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "content": <ContextMenuContent
            closePopover={[Function]}
            items={
              Array [
                Object {
                  "data-test-subj": "logoutLink",
                  "href": "",
                  "icon": <EuiIcon
                    size="m"
                    type="exit"
                  />,
                  "name": <Memo(MemoizedFormattedMessage)
                    defaultMessage="Log in"
                    id="xpack.security.navControlComponent.loginLinkText"
                  />,
                },
              ]
            }
          />,
          "id": 0,
          "title": "full name",
        },
      ]
    `);
  });
});
