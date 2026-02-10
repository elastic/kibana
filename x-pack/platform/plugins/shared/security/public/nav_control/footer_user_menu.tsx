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
  EuiContextMenuPanel,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { FunctionComponent, ReactNode } from 'react';
import React, { Fragment, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useObservable as useKbnObservable } from '@kbn/use-observable';
import type { Observable } from 'rxjs';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
import { UserAvatar, type UserProfileAvatarData } from '@kbn/user-profile-components';

import { getUserDisplayName, isUserAnonymous } from '../../common/model';
import { useCurrentUser, useUserProfile } from '../components';
import { ProfileModal } from './profile_modal';
import { version$ } from './version_context';

// Import tooltip hook - we'll need to create a simple version or use inline logic
const TOOLTIP_OFFSET = 4;

type ContextMenuItem = Omit<EuiContextMenuPanelItemDescriptor, 'content'> & {
  content?: ReactNode | ((args: { closePopover: () => void }) => ReactNode);
};

interface ContextMenuProps {
  items: ContextMenuItem[];
  closePopover: () => void;
}

const ContextMenuContent = ({ items, closePopover }: ContextMenuProps) => {
  return (
    <>
      <EuiContextMenuPanel>
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
              size="s"
              href={item.href}
              onClick={item.onClick as ((event: React.MouseEvent<Element, MouseEvent>) => void) | undefined}
              data-test-subj={item['data-test-subj']}
            >
              {item.name}
            </EuiContextMenuItem>
          );
        })}
      </EuiContextMenuPanel>
    </>
  );
};

interface FooterUserMenuProps {
  editProfileUrl: string;
  logoutUrl: string;
  userMenuLinks$: Observable<UserMenuLink[]>;
}

/**
 * Footer version of the user menu component.
 * Uses EuiButtonIcon instead of EuiHeaderSectionItemButton for consistency with footer items.
 */
export const FooterUserMenu: FunctionComponent<FooterUserMenuProps> = ({
  editProfileUrl,
  logoutUrl,
  userMenuLinks$,
}) => {
  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const userProfile = useUserProfile<{ avatar: UserProfileAvatarData }>('avatar,userSettings');
  const currentUser = useCurrentUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const version = useKbnObservable(version$, 'current');

  const displayName = currentUser.value ? getUserDisplayName(currentUser.value) : '';

  const wrapperStyles = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: ${euiTheme.size.xs};
  `;

  const dividerStyles = css`
    width: ${euiTheme.size.xl};
    height: 1px;
    background: ${euiTheme.border.color};
    margin: ${euiTheme.size.xs} 0;
  `;

  const buttonStyles = css`
    --high-contrast-hover-indicator-color: ${euiTheme.colors.textParagraph};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    padding: 0;
    border: none;
    background: transparent;
    color: ${euiTheme.colors.text};
    cursor: pointer;
    border-radius: ${euiTheme.border.radius.medium};
    transition: filter ${euiTheme.animation.fast} ease-in;

    &:hover:not(:disabled) {
      filter: brightness(0.9);
    }

    &:focus {
      outline: solid 2px ${euiTheme.focus.color};
      outline-offset: -2px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  const avatarContent =
    userProfile.value ? (
      <UserAvatar
        user={userProfile.value.user}
        avatar={userProfile.value.data.avatar}
        size="m"
        data-test-subj="footerUserMenuAvatar"
      />
    ) : currentUser.value && userProfile.error ? (
      <UserAvatar user={currentUser.value} size="m" data-test-subj="footerUserMenuAvatar" />
    ) : (
      <EuiLoadingSpinner size="m" />
    );

  const button = (
    <button
      type="button"
      aria-controls="footerUserMenu"
      aria-expanded={isPopoverOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
        defaultMessage: 'Account menu',
      })}
      onClick={() => setIsPopoverOpen((value) => (currentUser.value ? !value : false))}
      data-test-subj="footerUserMenuButton"
      css={buttonStyles}
      disabled={!currentUser.value}
    >
      {avatarContent}
    </button>
  );

  const items: ContextMenuItem[] = [];
  
  // Helper function to open navigation preferences modal
  const openNavigationPreferencesModal = () => {
    // For version 3, provide user profile data for appearance settings
    if (version === '3' && userProfile.value?.data) {
      const userSettings = (userProfile.value.data as any).userSettings;
      if (userSettings) {
        // Store user profile data temporarily for the modal to access
        (window as any).__kbnUserProfileForPreferences = userSettings;
        
        // Set up listener to provide user profile data when requested
        const handleGetUserProfile = () => {
          const currentUserSettings = (userProfile.value?.data as any)?.userSettings;
          if (currentUserSettings) {
            window.dispatchEvent(new CustomEvent('userProfileForPreferences', {
              detail: { userSettings: currentUserSettings },
            }));
          }
        };
        
        // Set up listener to update user profile when appearance changes
        const handleUpdateUserProfile = (e: Event) => {
          const customEvent = e as CustomEvent<{ userSettings?: { darkMode?: string; contrastMode?: string } }>;
          if (customEvent.detail?.userSettings && userProfile.value) {
            // Update user profile via API (preview)
            // This will be handled by the user profile API client
            const userProfileApiClient = (window as any).__kbnUserProfileApiClient;
            if (userProfileApiClient) {
              userProfileApiClient.partialUpdate({
                userSettings: customEvent.detail.userSettings,
              }).catch(() => {
                // Ignore errors for preview
              });
            }
          }
        };
        
        window.addEventListener('getUserProfileForPreferences', handleGetUserProfile);
        window.addEventListener('updateUserProfileForPreferences', handleUpdateUserProfile);
        
        // Clean up listeners when modal closes (will be cleaned up by modal close handler)
        (window as any).__cleanupPreferencesListeners = () => {
          window.removeEventListener('getUserProfileForPreferences', handleGetUserProfile);
          window.removeEventListener('updateUserProfileForPreferences', handleUpdateUserProfile);
          delete (window as any).__kbnUserProfileForPreferences;
          delete (window as any).__cleanupPreferencesListeners;
        };
      }
    }
    
    // Use requestAnimationFrame to ensure DOM is ready, then try multiple approaches
    requestAnimationFrame(() => {
      // First try: call global function directly
      if (typeof (window as any).__openNavigationPreferencesModal === 'function') {
        try {
          (window as any).__openNavigationPreferencesModal();
          return;
        } catch (e) {
          // If direct call fails, try event
        }
      }
      // Fallback: dispatch custom event
      const event = new CustomEvent('openNavigationPreferencesModal', { bubbles: true });
      window.dispatchEvent(event);
      document.dispatchEvent(event);
    });
  };
  
  // Add menu item first - "Preferences" for version 3, "Navigation preferences" for version 2 only
  // Version 1 has a separate button below the profile
  if (version !== '1') {
    const menuItemLabel = version === '3' ? (
      <FormattedMessage
        id="xpack.security.navControlComponent.preferencesLinkText"
        defaultMessage="Preferences"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.navControlComponent.navigationPreferencesLinkText"
        defaultMessage="Navigation preferences"
      />
    );

    items.push({
      name: menuItemLabel,
      icon: <EuiIcon type="brush" size="m" />,
      onClick: () => {
        setIsPopoverOpen(false);
        openNavigationPreferencesModal();
      },
      'data-test-subj': version === '3' ? 'footerPreferencesLink' : 'footerNavigationPreferencesLink',
    });
  }

  const isAnonymous = currentUser.value ? isUserAnonymous(currentUser.value) : false;
  const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);

  // Add Edit profile as second item
  if (!isAnonymous && !hasCustomProfileLinks) {
    const profileMenuItem: EuiContextMenuPanelItemDescriptor = {
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.editProfileLinkText"
          defaultMessage="Edit profile"
        />
      ),
      icon: <EuiIcon type="user" size="m" />,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPopoverOpen(false);
        setIsProfileModalOpen(true);
      },
      'data-test-subj': 'footerProfileLink',
    };

    items.push(profileMenuItem);
  }

  // Add user menu links after Navigation preferences and Edit profile
  if (userMenuLinks.length) {
    const userMenuLinkMenuItems = userMenuLinks
      .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
      .map(({ label, iconType, href, content }: UserMenuLink) => ({
        name: label,
        icon: <EuiIcon type={iconType} size="m" />,
        href,
        'data-test-subj': `footerUserMenuLink__${label}`,
        content,
      }));
    items.push(...userMenuLinkMenuItems);
  }

  items.push({
    name: isAnonymous ? (
      <FormattedMessage
        id="xpack.security.navControlComponent.loginLinkText"
        defaultMessage="Log in"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.navControlComponent.logoutLinkText"
        defaultMessage="Log out"
      />
    ),
    icon: <EuiIcon type="exit" size="m" />,
    href: logoutUrl,
    'data-test-subj': 'footerLogoutLink',
  });

  const tooltipContent = i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
    defaultMessage: 'Account menu',
  });

  // Navigation preferences button for version 1 (separate button below profile)
  const navigationPreferencesButton = version === '1' ? (
    <EuiToolTip
      content={i18n.translate('xpack.security.navControlComponent.navigationPreferencesLinkText', {
        defaultMessage: 'Navigation preferences',
      })}
      position="right"
      repositionOnScroll
      offset={TOOLTIP_OFFSET}
    >
      <EuiButtonIcon
        iconType="brush"
        size="m"
        aria-label={i18n.translate('xpack.security.navControlComponent.navigationPreferencesLinkText', {
          defaultMessage: 'Navigation preferences',
        })}
        onClick={openNavigationPreferencesModal}
        css={buttonStyles}
        data-test-subj="footerNavigationPreferencesButton"
      />
    </EuiToolTip>
  ) : null;

  // Wrap button in tooltip only when popover is closed
  const buttonWithTooltip = !isPopoverOpen ? (
    <EuiToolTip
      content={tooltipContent}
      disableScreenReaderOutput
      position="right"
      repositionOnScroll
      offset={TOOLTIP_OFFSET}
    >
      {button}
    </EuiToolTip>
  ) : (
    button
  );

  return (
    <>
      <div css={wrapperStyles}>
        {version !== '1' && navigationPreferencesButton}
        {version === '1' && <div css={dividerStyles} data-test-subj="footerUserMenuDivider" />}
        <EuiPopover
          id="footerUserMenu"
          ownFocus
          button={buttonWithTooltip}
          isOpen={isPopoverOpen}
          anchorPosition="rightUp"
          repositionOnScroll
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="none"
          offset={5}
        >
          <EuiContextMenu
            className="chrNavControl__userMenu"
            initialPanelId={0}
            panels={[
              {
                id: 0,
                title: displayName,
                content: (
                  <ContextMenuContent items={items} closePopover={() => setIsPopoverOpen(false)} />
                ),
              },
            ]}
            data-test-subj="footerUserMenu"
          />
        </EuiPopover>
        {version === '1' && navigationPreferencesButton}
      </div>
      {isProfileModalOpen && currentUser.value && (
        <ProfileModal
          user={currentUser.value}
          userProfileData={userProfile.value?.data}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
};

