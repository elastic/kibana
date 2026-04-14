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
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import type { FunctionComponent, MouseEvent, ReactNode } from 'react';
import React, { Fragment, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
import { UserAvatar, type UserProfileAvatarData } from '@kbn/user-profile-components';

import { getUserDisplayName, isUserAnonymous } from '../../common/model';
import { useCurrentUser, useUserProfile } from '../components';

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
              onClick={item.onClick}
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

interface SecurityNavControlProps {
  editProfileUrl: string;
  logoutUrl: string;
  userMenuLinks$: Observable<UserMenuLink[]>;
}

export const SecurityNavControl: FunctionComponent<SecurityNavControlProps> = ({
  editProfileUrl,
  logoutUrl,
  userMenuLinks$,
}) => {
  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const userProfile = useUserProfile<{ avatar: UserProfileAvatarData }>('avatar,userSettings');
  const currentUser = useCurrentUser(); // User profiles do not exist for anonymous users so need to fetch current user as well

  const displayName = currentUser.value ? getUserDisplayName(currentUser.value) : '';

  /* Project-header scoped Emotion loses to EuiButtonEmpty; #globalHeaderBars + test subj wins in both chrome layouts. */
  const userMenuHeaderChromeGlobal = useMemo(
    () => css`
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:hover:not(:disabled),
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:focus,
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:focus-visible,
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:hover:not(:disabled) *,
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:focus *,
      #globalHeaderBars button[data-test-subj='userMenuButton'].euiButtonEmpty:focus-visible * {
        text-decoration: none !important;
        text-decoration-line: none !important;
        text-underline-offset: 0 !important;
        -webkit-text-decoration: none !important;
      }

      #globalHeaderBars button[data-test-subj='userMenuButton']:hover:not(:disabled) [data-test-subj='userMenuAvatar'],
      #globalHeaderBars button[data-test-subj='userMenuButton']:focus-visible:not(:disabled) [data-test-subj='userMenuAvatar'] {
        filter: brightness(0.92) !important;
        transition: filter ${euiTheme.animation.fast} ${euiTheme.animation.resistance} !important;
      }

      #globalHeaderBars [data-test-subj='userMenuAvatar'] {
        transition: filter ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
      }
    `,
    [euiTheme.animation.fast, euiTheme.animation.resistance]
  );

  const button = (
    <EuiHeaderSectionItemButton
      aria-expanded={isPopoverOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
        defaultMessage: 'Account menu',
      })}
      onClick={() => setIsPopoverOpen((value) => (currentUser.value ? !value : false))}
      data-test-subj="userMenuButton"
      style={{ lineHeight: 'normal' }}
      /* Avoid euiButtonEmpty__text wrapper; flush removes empty-button hover fill (::before). */
      textProps={false}
      flush="both"
    >
      {userProfile.value ? (
        <UserAvatar
          user={userProfile.value.user}
          avatar={userProfile.value.data.avatar}
          size="m"
          data-test-subj="userMenuAvatar"
        />
      ) : currentUser.value && userProfile.error ? (
        <UserAvatar user={currentUser.value} size="m" data-test-subj="userMenuAvatar" />
      ) : (
        <EuiLoadingSpinner size="m" />
      )}
    </EuiHeaderSectionItemButton>
  );

  const items: ContextMenuItem[] = [];
  if (userMenuLinks.length) {
    const userMenuLinkMenuItems = userMenuLinks
      .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
      .map(({ label, iconType, href, onClick, content }: UserMenuLink) => ({
        name: label,
        icon: <EuiIcon type={iconType} size="m" />,
        href,
        onClick,
        'data-test-subj': `userMenuLink__${label}`,
        content,
      }));
    items.push(...userMenuLinkMenuItems);
  }

  const isAnonymous = currentUser.value ? isUserAnonymous(currentUser.value) : false;
  const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);

  if (!isAnonymous && !hasCustomProfileLinks) {
    const profileMenuItem: EuiContextMenuPanelItemDescriptor = {
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.editProfileLinkText"
          defaultMessage="Edit profile"
        />
      ),
      icon: <EuiIcon type="user" size="m" />,
      href: editProfileUrl,
      onClick: () => {
        setIsPopoverOpen(false);
      },
      'data-test-subj': 'profileLink',
    };

    // Set this as the first link if there is no user-defined profile link
    items.unshift(profileMenuItem);
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
    'data-test-subj': 'logoutLink',
  });

  return (
    <>
      <Global styles={userMenuHeaderChromeGlobal} />
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isPopoverOpen}
        anchorPosition="downRight"
        repositionOnScroll
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        buffer={0}
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
          data-test-subj="userMenu"
        />
      </EuiPopover>
    </>
  );
};
