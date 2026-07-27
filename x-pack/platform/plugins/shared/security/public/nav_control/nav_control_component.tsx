/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiContextMenuItem,
  EuiHeaderSectionItemButton,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FunctionComponent, MouseEvent, ReactNode } from 'react';
import React, { Fragment, useCallback, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import { useCurrentUser } from '@kbn/core-user-profile-browser-hooks';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
import { UserAvatar } from '@kbn/user-profile-components';

import { useSecurityApiClients } from '../components';

// Dev-only core API that swaps the active color theme in place (no page reload). Not part of the
// public `ThemeServiceStart` type, so we access it defensively and fall back to a reload if absent.
type ThemeWithLiveSwitch = CoreStart['theme'] & { setDarkMode?: (darkMode: boolean) => void };

type ContextMenuItem = Omit<EuiContextMenuPanelItemDescriptor, 'content' | 'onClick'> & {
  content?: ReactNode | ((args: { closePopover: () => void }) => ReactNode);
  onClick?: (event: MouseEvent<Element>) => void;
};

interface ContextMenuProps {
  items: ContextMenuItem[];
  closePopover: () => void;
}

const ContextMenuContent = ({ items, closePopover }: ContextMenuProps) => {
  return (
    <>
      {items.map((item, i) => {
        if (item.content) {
          return (
            <Fragment key={i}>
              {typeof item.content === 'function' ? item.content({ closePopover }) : item.content}
            </Fragment>
          );
        }
        return (
          <EuiContextMenuItem
            key={i}
            icon={item.icon}
            href={item.href}
            onClick={item.onClick}
            data-test-subj={item['data-test-subj']}
          >
            {item.name}
          </EuiContextMenuItem>
        );
      })}
    </>
  );
};

export interface SecurityNavControlRenderButtonProps {
  isOpen: boolean;
  toggleMenu: () => void;
  avatar: ReactNode;
}

interface SecurityNavControlProps {
  avatarSize?: 's' | 'm' | 'l';
  editProfileUrl: string;
  logoutUrl: string;
  renderButton?: (props: SecurityNavControlRenderButtonProps) => NonNullable<ReactNode>;
  userMenuLinks$: Observable<UserMenuLink[]>;
}

export const SecurityNavControl: FunctionComponent<SecurityNavControlProps> = ({
  editProfileUrl,
  logoutUrl,
  userMenuLinks$,
  renderButton,
  avatarSize = 's',
}) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<CoreStart>();
  const { userProfiles } = useSecurityApiClients();

  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { user } = useCurrentUser();

  const displayName = user?.displayName ?? '';
  const email = user?.email;
  const showEmail = Boolean(email) && email !== displayName;

  const coreTheme = useObservable(services.theme.theme$, services.theme.getTheme());
  const isDarkActive = coreTheme?.darkMode ?? false;
  // If a value is forced in kibana.yml (uiSettings.overrides.theme:darkMode) the user can't change it.
  const isThemeOverridden = services.uiSettings.isOverridden('theme:darkMode');

  const selectColorMode = useCallback(
    (mode: 'light' | 'dark') => {
      const themeService = services.theme as ThemeWithLiveSwitch;
      const appliedLive = typeof themeService.setDarkMode === 'function';

      // Apply the color mode to the running app without reloading, when the dev API is available.
      if (appliedLive) {
        themeService.setDarkMode(mode === 'dark');
      }

      // Persist the preference (partial update keeps other user settings, e.g. contrast, intact).
      userProfiles.partialUpdate({ userSettings: { darkMode: mode } }).catch(() => {
        // Ignore persistence errors: the mode is already applied for this session.
      });

      // Only reload if we couldn't switch the theme in place.
      if (!appliedLive) {
        window.location.reload();
      }
    },
    [services.theme, userProfiles]
  );

  const toggleMenu = useCallback(
    () => setIsPopoverOpen((value) => (user ? !value : false)),
    [user]
  );

  const avatar = user ? (
    <UserAvatar
      user={{ username: user.username, email: user.email, full_name: user.fullName }}
      avatar={user.avatar}
      size={avatarSize}
      data-test-subj="userMenuAvatar"
    />
  ) : (
    <EuiLoadingSpinner size="m" />
  );

  const button = renderButton ? (
    renderButton({ isOpen: isPopoverOpen, toggleMenu, avatar })
  ) : (
    <EuiHeaderSectionItemButton
      aria-expanded={isPopoverOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
        defaultMessage: 'Account menu',
      })}
      onClick={toggleMenu}
      data-test-subj="userMenuButton"
      style={{ lineHeight: 'normal' }}
    >
      {avatar}
    </EuiHeaderSectionItemButton>
  );

  const items: ContextMenuItem[] = [];
  if (userMenuLinks.length) {
    const userMenuLinkMenuItems = userMenuLinks
      .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
      .map(({ label, iconType, href, onClick, content }: UserMenuLink) => ({
        name: label,
        icon: <EuiIcon type={iconType} size="m" aria-hidden={true} />,
        href,
        onClick,
        'data-test-subj': `userMenuLink__${label}`,
        content,
      }));
    items.push(...userMenuLinkMenuItems);
  }

  const isAnonymous = user?.isAnonymous ?? false;
  const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);

  if (!isAnonymous && !hasCustomProfileLinks) {
    const profileMenuItem: EuiContextMenuPanelItemDescriptor = {
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.editProfileLinkText"
          defaultMessage="Edit profile"
        />
      ),
      icon: <EuiIcon type="user" size="m" aria-hidden={true} />,
      href: editProfileUrl,
      onClick: () => {
        setIsPopoverOpen(false);
      },
      'data-test-subj': 'profileLink',
    };

    // Set this as the first link if there is no user-defined profile link
    items.unshift(profileMenuItem);
  }

  const showThemeSection = !isAnonymous && !isThemeOverridden;

  const renderThemeItemIcon = (active: boolean) => (
    <EuiIcon type={active ? 'check' : 'empty'} size="m" aria-hidden={true} />
  );

  const menuContent = (
    <>
      <div
        css={css`
          padding: ${euiTheme.size.base} ${euiTheme.size.m} ${euiTheme.size.s};
        `}
        data-test-subj="userMenuHeader"
      >
        <EuiText
          size="s"
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {displayName}
        </EuiText>
        {showEmail ? (
          <EuiText size="xs" color="subdued">
            {email}
          </EuiText>
        ) : null}
      </div>

      <EuiHorizontalRule margin="none" />

      <ContextMenuContent items={items} closePopover={() => setIsPopoverOpen(false)} />

      {showThemeSection ? (
        <>
          <EuiHorizontalRule margin="none" />
          <div
            css={css`
              padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.xs};
            `}
          >
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              {i18n.translate('xpack.security.navControlComponent.themeSectionTitle', {
                defaultMessage: 'Theme',
              })}
            </EuiText>
          </div>
          <EuiContextMenuItem
            icon={renderThemeItemIcon(!isDarkActive)}
            onClick={() => selectColorMode('light')}
            data-test-subj="userMenuThemeLight"
          >
            <FormattedMessage
              id="xpack.security.navControlComponent.themeLightText"
              defaultMessage="Light"
            />
          </EuiContextMenuItem>
          <EuiContextMenuItem
            icon={renderThemeItemIcon(isDarkActive)}
            onClick={() => selectColorMode('dark')}
            data-test-subj="userMenuThemeDark"
          >
            <FormattedMessage
              id="xpack.security.navControlComponent.themeDarkText"
              defaultMessage="Dark"
            />
          </EuiContextMenuItem>
        </>
      ) : null}

      <EuiHorizontalRule margin="none" />

      <EuiContextMenuItem
        icon={<EuiIcon type="logOut" size="m" color="danger" aria-hidden={true} />}
        href={logoutUrl}
        data-test-subj="logoutLink"
        css={css`
          color: ${euiTheme.colors.textDanger};
        `}
      >
        {isAnonymous ? (
          <FormattedMessage
            id="xpack.security.navControlComponent.loginLinkText"
            defaultMessage="Log in"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.navControlComponent.logoutLinkText"
            defaultMessage="Log out"
          />
        )}
      </EuiContextMenuItem>
    </>
  );

  return (
    <EuiPopover
      ownFocus
      button={button}
      isOpen={isPopoverOpen}
      anchorPosition="downRight"
      repositionOnScroll
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      buffer={0}
      aria-label={i18n.translate('xpack.security.navControlComponent.popoverAriaLabel', {
        defaultMessage: 'Account menu',
      })}
    >
      <EuiContextMenu
        className="chrNavControl__userMenu"
        initialPanelId={0}
        panels={[
          {
            id: 0,
            width: 256,
            content: menuContent,
          },
        ]}
        data-test-subj="userMenu"
      />
    </EuiPopover>
  );
};
