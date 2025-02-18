/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { mount } from 'enzyme';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';

import { UserProfile, useUserProfileForm } from './user_profile';
import { UserProfileAPIClient } from '..';
import type { UserProfileData } from '../../../common';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { UserAPIClient } from '../../management';
import { securityMock } from '../../mocks';
import { Providers } from '../account_management_app';

const user = mockAuthenticatedUser();
const coreStart = coreMock.createStart();
let history = scopedHistoryMock.create();
const authc = securityMock.createSetup().authc;

const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <Providers
    services={coreStart}
    history={history}
    authc={authc}
    securityApiClients={{
      userProfiles: new UserProfileAPIClient(coreStart.http),
      users: new UserAPIClient(coreStart.http),
    }}
  >
    {children}
  </Providers>
);

describe('useUserProfileForm', () => {
  beforeEach(() => {
    history = scopedHistoryMock.create();
    authc.getCurrentUser.mockReset();
    // @ts-ignore Capabilities are marked as readonly without a way of overriding.
    coreStart.application.capabilities = {
      management: {
        security: {
          users: true,
        },
      },
    };
    coreStart.http.delete.mockReset();
    coreStart.http.get.mockReset();
    coreStart.http.post.mockReset().mockResolvedValue(undefined);
    coreStart.notifications.toasts.addDanger.mockReset();
    coreStart.notifications.toasts.addSuccess.mockReset();
    coreStart.settings.client.get.mockReset();
    coreStart.settings.client.isOverridden.mockReset();
  });

  it('should initialise form with values from user profile', () => {
    const data: UserProfileData = {
      avatar: {},
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    expect(result.current.values).toMatchInlineSnapshot(`
      Object {
        "avatarType": "initials",
        "data": Object {
          "avatar": Object {
            "color": "#61A2FF",
            "imageUrl": "",
            "initials": "fn",
          },
          "userSettings": Object {
            "darkMode": "space_default",
          },
        },
        "user": Object {
          "email": "email",
          "full_name": "full name",
        },
      }
    `);
  });

  it('should initialise form with values from user avatar if present', () => {
    const data: UserProfileData = {
      avatar: {
        imageUrl: 'avatar.png',
      },
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    expect(result.current.values).toEqual(
      expect.objectContaining({
        avatarType: 'image',
        data: expect.objectContaining({
          avatar: expect.objectContaining({
            imageUrl: 'avatar.png',
          }),
        }),
      })
    );
  });

  it('should update initials when full name changes', async () => {
    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.setFieldValue('user.full_name', 'Another Name');
    });

    expect(result.current.values.user.full_name).toEqual('Another Name');
    expect(result.current.values.data?.avatar.initials).toEqual('AN');
  });

  it('should save user and user profile when submitting form', async () => {
    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(coreStart.http.post).toHaveBeenCalledTimes(2);
  });

  it("should save user profile only when user details can't be updated", async () => {
    // @ts-ignore Capabilities are marked as readonly without a way of overriding.
    coreStart.application.capabilities = {
      management: {
        security: {
          users: false,
        },
      },
    };

    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(coreStart.http.post).toHaveBeenCalledTimes(1);
  });

  it('should add toast after submitting form successfully', async () => {
    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('should add toast after submitting form failed', async () => {
    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    coreStart.http.post.mockRejectedValue(new Error('Error'));

    await act(async () => {
      await result.current.submitForm();
    });

    expect(coreStart.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('should set initial values to current values after submitting form successfully', async () => {
    const data: UserProfileData = {};
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.setFieldValue('user.full_name', 'Another Name');
      await result.current.submitForm();
    });

    expect(result.current.initialValues.user.full_name).toEqual('Another Name');
  });

  describe('User Avatar Form', () => {
    it('should display if the User is not a cloud user', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );

      expect(testWrapper.exists('UserAvatar')).toBeTruthy();
    });

    it('should not display if the User is a cloud user', () => {
      const data: UserProfileData = {};

      const cloudUser = mockAuthenticatedUser({ elastic_cloud_user: true });

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={cloudUser} data={data} />
        </Providers>
      );

      expect(testWrapper.exists('UserAvatar')).toBeFalsy();
    });
  });

  describe('Dark Mode Form', () => {
    it('should display if the User is not a cloud user', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );

      const overrideMsg = testWrapper.find('EuiToolTip[data-test-subj="themeOverrideTooltip"]');
      expect(overrideMsg).toHaveLength(0);

      const themeMenu = testWrapper.find('EuiKeyPadMenu[data-test-subj="themeMenu"]');
      expect(themeMenu).toHaveLength(1);

      const themeOptions = themeMenu.find('EuiKeyPadMenuItem');
      expect(themeOptions).toHaveLength(4);
      themeOptions.forEach((option) => {
        const menuItemEl = (option.getDOMNode() as unknown as Element[])[1];
        expect(menuItemEl.className).not.toContain('disabled');
      });
    });

    it('should not display if the User is a cloud user', () => {
      const data: UserProfileData = {};

      const cloudUser = mockAuthenticatedUser({ elastic_cloud_user: true });

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={cloudUser} data={data} />
        </Providers>
      );

      expect(testWrapper.exists('EuiKeyPadMenu[data-test-subj="themeMenu"]')).toBeFalsy();
    });

    it('should add special toast after submitting form successfully since darkMode requires a refresh', async () => {
      const data: UserProfileData = {};
      const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenNthCalledWith(
        1,
        { title: 'Profile updated' },
        {}
      );

      await act(async () => {
        await result.current.setFieldValue('data.userSettings.darkMode', 'dark');
        await result.current.submitForm();
      });

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ title: 'Profile updated' }),
        expect.objectContaining({ toastLifeTimeMs: 300000 })
      );
    });

    it('should be disabled if the theme has been set to `darkMode: true` in the config', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.theme.getTheme.mockReturnValue({ darkMode: true, name: 'amsterdam' });
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );

      const overrideMsg = testWrapper.find('EuiToolTip[data-test-subj="themeOverrideTooltip"]');
      expect(overrideMsg).toHaveLength(1);
      expect(overrideMsg.getElement().props.content).not.toEqual('');

      const themeMenu = testWrapper.find('EuiKeyPadMenu[data-test-subj="themeMenu"]');
      expect(themeMenu).toHaveLength(1);

      const themeOptions = themeMenu.find('EuiKeyPadMenuItem');
      expect(themeOptions).toHaveLength(4);
      themeOptions.forEach((option) => {
        const menuItemEl = (option.getDOMNode() as unknown as Element[])[1];
        expect(menuItemEl.className).toContain('disabled');
      });
    });

    it('should be disabled if the theme has been set to `darkMode: false` in the config', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.theme.getTheme.mockReturnValue({ darkMode: false, name: 'amsterdam' });
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );

      const overrideMsg = testWrapper.find('EuiToolTip[data-test-subj="themeOverrideTooltip"]');
      expect(overrideMsg).toHaveLength(1);
      expect(overrideMsg.getElement().props.content).not.toEqual('');

      const themeMenu = testWrapper.find('EuiKeyPadMenu[data-test-subj="themeMenu"]');
      expect(themeMenu).toHaveLength(1);

      const themeOptions = themeMenu.find('EuiKeyPadMenuItem');
      expect(themeOptions).toHaveLength(4);
      themeOptions.forEach((option) => {
        const menuItemEl = (option.getDOMNode() as unknown as Element[])[1];
        expect(menuItemEl.className).toContain('disabled');
      });
    });
  });

  describe('User roles section', () => {
    it('should display the user roles', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.settings.client.get.mockReturnValue(false);
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );
      expect(testWrapper.exists('dl[data-test-subj="userRoles"]')).toBeTruthy();

      expect(testWrapper.exists('button[data-test-subj="userRolesExpand"]')).toBeFalsy();
      expect(testWrapper.exists('EuiBadgeGroup[data-test-subj="remainingRoles"]')).toBeFalsy();
    });

    it('should display a popover for users with more than three roles', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.settings.client.get.mockReturnValue(false);
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      nonCloudUser.roles = [...nonCloudUser.roles, 'user-role-1', 'user-role-2', 'user-role-3'];
      const testWrapper = mount(
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles: new UserProfileAPIClient(coreStart.http),
            users: new UserAPIClient(coreStart.http),
          }}
        >
          <UserProfile user={nonCloudUser} data={data} />
        </Providers>
      );

      const extraRoles = nonCloudUser.roles.splice(3);

      const userRolesExpandButton = testWrapper.find('button[data-test-subj="userRolesExpand"]');

      expect(userRolesExpandButton).toBeTruthy();
      expect(userRolesExpandButton.text()).toEqual(`+${extraRoles.length}`);
    });
  });
});
