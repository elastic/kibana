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
} from '@elastic/eui';
import type { FunctionComponent, ReactNode } from 'react';
import React, { Fragment, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

<<<<<<< HEAD
import type { BuildFlavor } from '@kbn/config/src/types';
=======
import { useCurrentUser } from '@kbn/core-user-profile-browser-hooks';
>>>>>>> 8651516d201e ([Profile]: added useCurrentUser hook, caching to UserProfileAPIClient (#274015))
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
import { UserAvatar } from '@kbn/user-profile-components';

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
  buildFlavour: BuildFlavor;
}

export const SecurityNavControl: FunctionComponent<SecurityNavControlProps> = ({
  editProfileUrl,
  logoutUrl,
  userMenuLinks$,
  buildFlavour,
}) => {
  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { user } = useCurrentUser();

  const displayName = user?.displayName ?? '';

<<<<<<< HEAD
  const button = (
=======
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
>>>>>>> 8651516d201e ([Profile]: added useCurrentUser hook, caching to UserProfileAPIClient (#274015))
    <EuiHeaderSectionItemButton
      aria-controls="headerUserMenu"
      aria-expanded={isPopoverOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
        defaultMessage: 'Account menu',
      })}
      onClick={() => setIsPopoverOpen((value) => (currentUser.value ? !value : false))}
      data-test-subj="userMenuButton"
      style={{ lineHeight: 'normal' }}
    >
      {userProfile.value ? (
        <UserAvatar
          user={userProfile.value.user}
          avatar={userProfile.value.data.avatar}
          size="s"
          data-test-subj="userMenuAvatar"
        />
      ) : currentUser.value && userProfile.error ? (
        <UserAvatar user={currentUser.value} size="s" data-test-subj="userMenuAvatar" />
      ) : (
        <EuiLoadingSpinner size="m" />
      )}
    </EuiHeaderSectionItemButton>
  );

  const items: ContextMenuItem[] = [];
  if (userMenuLinks.length) {
    const userMenuLinkMenuItems = userMenuLinks
      .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
      .map(({ label, iconType, href, content }: UserMenuLink) => ({
        name: label,
        icon: <EuiIcon type={iconType} size="m" />,
        href,
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
    ) : buildFlavour === 'serverless' ? (
      <FormattedMessage
        id="xpack.security.navControlComponent.closeProjectLinkText"
        defaultMessage="Close project"
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
    <EuiPopover
      id="headerUserMenu"
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
  );
};
