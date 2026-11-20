/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { deriveChromeColors } from '@kbn/core-user-settings-common';

import { UserProfile, useUserProfileForm, validateAvatarInitials } from './user_profile';
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
const profileUpdateBody = () => {
  const calls = coreStart.http.post.mock.calls as unknown as Array<[string, { body: string }]>;
  const profileCall = calls.find(([path]) => path === '/internal/security/user_profile/_data');
  if (!profileCall) {
    throw new Error('Profile update was not posted');
  }
  return JSON.parse(profileCall[1].body);
};

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
    coreStart.analytics.reportEvent.mockReset();
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
            "chromeColor": "",
            "chromeColorDark": "",
            "chromeColorLight": "",
            "contrastMode": "system",
            "darkMode": "system",
            "locale": "en",
            "rememberSelectedSpace": true,
          },
        },
        "user": Object {
          "email": "email",
          "full_name": "full name",
        },
      }
    `);
  });

  it('should initialise the chrome colors from user profile data', () => {
    const data: UserProfileData = {
      avatar: {},
      userSettings: {
        chromeColor: '#0B64DD',
        chromeColorLight: '#ECF1F9',
        chromeColorDark: '#07101F',
      },
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    expect(result.current.values.data?.userSettings).toEqual(
      expect.objectContaining({
        chromeColor: '#0B64DD',
        chromeColorLight: '#ECF1F9',
        chromeColorDark: '#07101F',
      })
    );
  });

  it('should save the chrome colors without asking for a page reload', async () => {
    const data: UserProfileData = { avatar: {} };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.setFieldValue('data.userSettings.chromeColor', '#0B64DD');
    });
    await act(async () => {
      await result.current.submitForm();
    });

    expect(profileUpdateBody().userSettings).toEqual(
      expect.objectContaining({ chromeColor: '#0B64DD', chromeColorLight: '', chromeColorDark: '' })
    );
    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(coreStart.notifications.toasts.addSuccess.mock.calls[0])).not.toContain(
      'Reload'
    );
  });

  it('should initialise rememberSelectedSpace from user profile data', () => {
    const data: UserProfileData = {
      avatar: {},
      userSettings: {
        rememberSelectedSpace: true,
      },
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    expect(result.current.values.data?.userSettings?.rememberSelectedSpace).toBe(true);
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

  describe('validateAvatarInitials', () => {
    it('requires initials', () => {
      expect(validateAvatarInitials('')).toEqual('Add initials');
    });

    it.each(['AB', '\u{1F44D}\u{1F3FD}\u{1F44D}\u{1F3FD}', 'A\u{1F44D}', '\u0915\u094D\u0937'])(
      'accepts %s',
      (initials) => {
        expect(validateAvatarInitials(initials)).toBeUndefined();
      }
    );

    it('rejects more than 2 characters', () => {
      expect(validateAvatarInitials('ABC')).toEqual('Enter no more than 2 characters.');
    });
  });

  it('should not send invalid stored initials when saving with an image avatar', async () => {
    const data: UserProfileData = {
      avatar: { imageUrl: 'avatar.png', initials: 'ABC' },
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.setFieldValue('data.userSettings.darkMode', 'dark');
    });
    await act(async () => {
      await result.current.submitForm();
    });

    const { avatar, userSettings } = profileUpdateBody();
    expect(avatar).toEqual(expect.objectContaining({ imageUrl: 'avatar.png' }));
    expect(avatar).not.toHaveProperty('initials');
    expect(userSettings.darkMode).toBe('dark');
  });

  it('should send valid stored initials when saving with an image avatar', async () => {
    const data: UserProfileData = {
      avatar: { imageUrl: 'avatar.png', initials: 'AB' },
    };
    const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(profileUpdateBody().avatar).toEqual(
      expect.objectContaining({ imageUrl: 'avatar.png', initials: 'AB' })
    );
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
    });
    await act(async () => {
      await result.current.submitForm();
    });

    expect(result.current.initialValues.user.full_name).toEqual('Another Name');
  });

  describe('User Avatar Form', () => {
    it('should display if the User is not a cloud user', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });

      const { container } = render(
        coreStart.rendering.addContext(
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
        )
      );

      expect(container.querySelector('.euiAvatar')).toBeInTheDocument();
    });

    it('should not display if the User is a cloud user', () => {
      const data: UserProfileData = {};

      const cloudUser = mockAuthenticatedUser({ elastic_cloud_user: true });

      const { container } = render(
        coreStart.rendering.addContext(
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
        )
      );

      expect(container.querySelector('.euiAvatar')).not.toBeInTheDocument();
    });

    it('should submit initials with a modifier emoji entered in the form', async () => {
      const userActions = userEvent.setup();
      const data: UserProfileData = {};
      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      const initials = '\u{1F44D}\u{1F3FD}\u{1F44D}\u{1F3FD}';

      const { container } = render(
        coreStart.rendering.addContext(
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
        )
      );

      const initialsInput = container.querySelector<HTMLInputElement>(
        'input[name="data.avatar.initials"]'
      );
      if (!initialsInput) {
        throw new Error('Initials input was not rendered');
      }
      await userActions.clear(initialsInput);
      await userActions.type(initialsInput, initials);
      expect(initialsInput).toHaveValue(initials);

      await userActions.click(screen.getByTestId('saveProfileChangesButton'));

      expect(profileUpdateBody().avatar.initials).toBe(initials);
    });
  });

  describe('Dark Mode Form', () => {
    it('should register a chrome color change as an unsaved change', async () => {
      render(
        coreStart.rendering.addContext(
          <Providers
            services={coreStart}
            history={history}
            authc={authc}
            securityApiClients={{
              userProfiles: new UserProfileAPIClient(coreStart.http),
              users: new UserAPIClient(coreStart.http),
            }}
          >
            <UserProfile user={mockAuthenticatedUser()} data={{}} />
          </Providers>
        )
      );

      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Custom appearance' })).not.toBeChecked();

      await userEvent.click(screen.getByRole('switch', { name: 'Custom appearance' }));

      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('userProfileChromeColorOption-#010101'));

      expect(await screen.findByText('1 unsaved change')).toBeInTheDocument();
      expect(screen.getByTestId('userProfileChromeColorInput-chromeColorLight')).not.toBeVisible();
      expect(screen.getByTestId('userProfileChromeColorInput-chromeColorDark')).not.toBeVisible();
    });

    it('should display read-only mode colors and unlock custom colors from Edit', async () => {
      const data: UserProfileData = { userSettings: { chromeColor: '#0B64DD' } };
      const { light, dark } = deriveChromeColors('#0B64DD');

      render(
        coreStart.rendering.addContext(
          <Providers
            services={coreStart}
            history={history}
            authc={authc}
            securityApiClients={{
              userProfiles: new UserProfileAPIClient(coreStart.http),
              users: new UserAPIClient(coreStart.http),
            }}
          >
            <UserProfile user={mockAuthenticatedUser()} data={data} />
          </Providers>
        )
      );

      expect(screen.getByTestId('userProfileCustomAppearance')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Custom appearance' })).toBeChecked();
      expect(screen.getByTestId('userProfile-chromeColor')).toBeInTheDocument();

      const lightInput = screen.getByTestId('userProfileChromeColorInput-chromeColorLight');
      const darkInput = screen.getByTestId('userProfileChromeColorInput-chromeColorDark');
      expect(lightInput).toHaveValue(light);
      expect(darkInput).toHaveValue(dark);
      expect(lightInput).toHaveAttribute('readonly');
      expect(darkInput).toHaveAttribute('readonly');
      expect(screen.queryByTestId('userProfileChromeColorAdvanced')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('euiColorPickerAnchor userProfile-chromeColorLight')
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Edit light and dark mode colors' })
      );

      expect(
        screen.getByRole('button', { name: 'Done editing light and dark mode colors' })
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('euiColorPickerAnchor userProfile-chromeColorLight')
      ).toBeEnabled();
      expect(screen.getByTestId('euiColorPickerAnchor userProfile-chromeColorDark')).toBeEnabled();
      expect(lightInput).toHaveAttribute('readonly');
      expect(darkInput).toHaveAttribute('readonly');
    });

    it('should clear chrome colors and ask to save when custom appearance is turned off', async () => {
      const data: UserProfileData = {
        userSettings: {
          chromeColor: '#0B64DD',
          chromeColorLight: '#ECF1F9',
          chromeColorDark: '#07101F',
        },
      };

      render(
        coreStart.rendering.addContext(
          <Providers
            services={coreStart}
            history={history}
            authc={authc}
            securityApiClients={{
              userProfiles: new UserProfileAPIClient(coreStart.http),
              users: new UserAPIClient(coreStart.http),
            }}
          >
            <UserProfile user={mockAuthenticatedUser()} data={data} />
          </Providers>
        )
      );

      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch', { name: 'Custom appearance' }));

      expect(screen.getByRole('switch', { name: 'Custom appearance' })).not.toBeChecked();
      expect(screen.getByTestId('userProfile-chromeColor')).not.toBeVisible();
      expect(await screen.findByText('3 unsaved changes')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch', { name: 'Custom appearance' }));

      expect(screen.getByRole('switch', { name: 'Custom appearance' })).toBeChecked();
      expect(screen.getByTestId('userProfile-chromeColor')).toBeVisible();
      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
    });

    it('should save cleared chrome colors when custom appearance is turned off', async () => {
      const data: UserProfileData = {
        userSettings: {
          chromeColor: '#0B64DD',
          chromeColorLight: '#ECF1F9',
          chromeColorDark: '#07101F',
        },
      };

      render(
        coreStart.rendering.addContext(
          <Providers
            services={coreStart}
            history={history}
            authc={authc}
            securityApiClients={{
              userProfiles: new UserProfileAPIClient(coreStart.http),
              users: new UserAPIClient(coreStart.http),
            }}
          >
            <UserProfile user={mockAuthenticatedUser()} data={data} />
          </Providers>
        )
      );

      await userEvent.click(screen.getByRole('switch', { name: 'Custom appearance' }));
      await userEvent.click(screen.getByTestId('saveProfileChangesButton'));

      expect(profileUpdateBody().userSettings).toEqual(
        expect.objectContaining({
          chromeColor: '',
          chromeColorLight: '',
          chromeColorDark: '',
        })
      );
    });

    it('should display if the User is not a cloud user', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });

      render(
        coreStart.rendering.addContext(
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
        )
      );

      const themeMenu = screen.getByTestId('themeMenu');
      expect(themeMenu).toBeInTheDocument();
      expect(themeMenu.closest('.euiToolTipAnchor')).toBeNull();

      const themeItems = within(themeMenu).getAllByRole('radio');
      expect(themeItems).toHaveLength(4);
      themeItems.forEach((item) => {
        expect(item).not.toBeDisabled();
      });
    });

    it('should not display if the User is a cloud user', () => {
      const data: UserProfileData = {};

      const cloudUser = mockAuthenticatedUser({ elastic_cloud_user: true });

      render(
        coreStart.rendering.addContext(
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
        )
      );

      expect(screen.queryByTestId('themeMenu')).not.toBeInTheDocument();
    });

    it('should not ask for a page reload after changing darkMode', async () => {
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
      });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenNthCalledWith(
        2,
        { title: 'Profile updated' },
        {}
      );
    });

    it('should be disabled if the theme has been set to `darkMode: true` in the config', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.theme.getTheme.mockReturnValue({ darkMode: true, name: 'borealis' });
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      render(
        coreStart.rendering.addContext(
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
        )
      );

      const themeMenu = screen.getByTestId('themeMenu');
      expect(themeMenu).toBeInTheDocument();
      expect(themeMenu.closest('.euiToolTipAnchor')).not.toBeNull();

      const themeItems = within(themeMenu).getAllByRole('radio');
      expect(themeItems).toHaveLength(4);
      themeItems.forEach((item) => {
        expect(item).toBeDisabled();
      });
    });

    it('should be disabled if the theme has been set to `darkMode: false` in the config', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.theme.getTheme.mockReturnValue({ darkMode: false, name: 'borealis' });
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      render(
        coreStart.rendering.addContext(
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
        )
      );

      const themeMenu = screen.getByTestId('themeMenu');
      expect(themeMenu).toBeInTheDocument();
      expect(themeMenu.closest('.euiToolTipAnchor')).not.toBeNull();

      const themeItems = within(themeMenu).getAllByRole('radio');
      expect(themeItems).toHaveLength(4);
      themeItems.forEach((item) => {
        expect(item).toBeDisabled();
      });
    });
  });

  describe('Contrast Mode Form', () => {
    it('should not ask for a page reload after changing contrast mode', async () => {
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
        await result.current.setFieldValue('data.userSettings.contrastMode', 'high'); // default value is 'system'
      });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenNthCalledWith(
        2,
        { title: 'Profile updated' },
        {}
      );
    });
  });

  describe('Display Language Form', () => {
    const renderWithLoadedProfile = async (data: UserProfileData) => {
      coreStart.http.get.mockResolvedValue({ data });
      const userProfiles = new UserProfileAPIClient(coreStart.http);
      await userProfiles.getCurrent({ dataPath: 'userSettings' });

      const loadedWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
        <Providers
          services={coreStart}
          history={history}
          authc={authc}
          securityApiClients={{
            userProfiles,
            users: new UserAPIClient(coreStart.http),
          }}
        >
          {children}
        </Providers>
      );

      return renderHook(() => useUserProfileForm({ user, data }), { wrapper: loadedWrapper });
    };

    it('should report display_language_changed event when locale is changed on submit', async () => {
      const data: UserProfileData = {
        userSettings: { darkMode: 'light', contrastMode: 'standard', locale: 'en' },
      };

      const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

      await act(async () => {
        await result.current.setFieldValue('data.userSettings.locale', 'fr-FR');
      });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith('display_language_changed', {
        from: 'en',
        to: 'fr-FR',
      });
    });

    it('should not report event when locale is unchanged on submit', async () => {
      const data: UserProfileData = {
        userSettings: { darkMode: 'light', contrastMode: 'standard', locale: 'en' },
      };

      const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('should not send the fallback locale when no locale is stored', async () => {
      const data: UserProfileData = {
        userSettings: { darkMode: 'light', contrastMode: 'standard' },
      };
      const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

      expect(result.current.values.data?.userSettings.locale).toBe('en');

      await act(async () => {
        await result.current.setFieldValue('data.userSettings.darkMode', 'dark');
      });
      await act(async () => {
        await result.current.submitForm();
      });

      const { userSettings } = profileUpdateBody();
      expect(userSettings.darkMode).toBe('dark');
      expect(userSettings).not.toHaveProperty('locale');
    });

    it('should not send a stored locale when another setting changes', async () => {
      const data: UserProfileData = {
        userSettings: { darkMode: 'light', contrastMode: 'standard', locale: 'de-DE' },
      };
      const { result } = await renderWithLoadedProfile(data);

      await act(async () => {
        await result.current.setFieldValue('data.userSettings.darkMode', 'dark');
      });
      await act(async () => {
        await result.current.submitForm();
      });

      const { userSettings } = profileUpdateBody();
      expect(userSettings.darkMode).toBe('dark');
      expect(userSettings).not.toHaveProperty('locale');
    });

    it('should send the locale when it is changed on submit', async () => {
      const data: UserProfileData = {
        userSettings: { darkMode: 'light', contrastMode: 'standard', locale: 'de-DE' },
      };
      const { result } = renderHook(() => useUserProfileForm({ user, data }), { wrapper });

      await act(async () => {
        await result.current.setFieldValue('data.userSettings.locale', 'fr-FR');
      });
      await act(async () => {
        await result.current.submitForm();
      });

      expect(profileUpdateBody().userSettings.locale).toBe('fr-FR');
    });
  });

  describe('User roles section', () => {
    it('should display the user roles', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.settings.client.get.mockReturnValue(false);
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      render(
        coreStart.rendering.addContext(
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
        )
      );
      expect(screen.getByTestId('userRoles')).toBeInTheDocument();

      expect(screen.queryByTestId('userRolesExpand')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remainingRoles')).not.toBeInTheDocument();
    });

    it('should display a popover for users with more than three roles', () => {
      const data: UserProfileData = {};

      const nonCloudUser = mockAuthenticatedUser({ elastic_cloud_user: false });
      coreStart.settings.client.get.mockReturnValue(false);
      coreStart.settings.client.isOverridden.mockReturnValue(true);

      nonCloudUser.roles = [...nonCloudUser.roles, 'user-role-1', 'user-role-2', 'user-role-3'];
      render(
        coreStart.rendering.addContext(
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
        )
      );

      const extraRoles = nonCloudUser.roles.splice(3);

      const userRolesExpandButton = screen.getByTestId('userRolesExpand');

      expect(userRolesExpandButton).toBeInTheDocument();
      expect(userRolesExpandButton).toHaveTextContent(`+${extraRoles.length}`);
    });
  });
});
