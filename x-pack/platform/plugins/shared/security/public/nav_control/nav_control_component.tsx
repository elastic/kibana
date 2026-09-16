/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  EuiContextMenu,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import type { FunctionComponent, ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { useCurrentUser } from '@kbn/core-user-profile-browser-hooks';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
import { UserAvatar } from '@kbn/user-profile-components';

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
  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { user } = useCurrentUser();

  const displayName = user?.displayName ?? '';

  const toggleMenu = useCallback(
    () => setIsPopoverOpen((value) => (user ? !value : false)),
    [user]
  );

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

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

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const rootItems: EuiContextMenuPanelItemDescriptor[] = [];
    const nestedPanels: EuiContextMenuPanelDescriptor[] = [];
    let nextPanelId = 1;

    const sortedLinks = [...userMenuLinks].sort(
      ({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB
    );

    const isAnonymous = user?.isAnonymous ?? false;
    const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);

    if (!isAnonymous && !hasCustomProfileLinks) {
      rootItems.push({
        name: (
          <FormattedMessage
            id="xpack.security.navControlComponent.editProfileLinkText"
            defaultMessage="Edit profile"
          />
        ),
        icon: <EuiIcon type="user" size="m" aria-hidden={true} />,
        href: editProfileUrl,
        onClick: closePopover,
        'data-test-subj': 'profileLink',
      });
    }

    for (const link of sortedLinks) {
      if (link.content) {
        rootItems.push({
          key: `user-menu-content-${link.label || link.order}`,
          renderItem: () =>
            typeof link.content === 'function'
              ? link.content({ closePopover })
              : link.content,
        });
        continue;
      }

      if (link.panelItems?.length) {
        const panelId = nextPanelId++;
        rootItems.push({
          name: link.label,
          icon: link.iconType ? (
            <EuiIcon type={link.iconType} size="m" aria-hidden={true} />
          ) : undefined,
          panel: panelId,
          'data-test-subj': `userMenuLink__${link.label}`,
        });
        nestedPanels.push({
          id: panelId,
          title: link.label,
          items: link.panelItems.map((panelItem, index) => ({
            name: panelItem.name,
            key: `panel-item-${panelId}-${index}`,
            onClick: () => {
              panelItem.onClick?.();
              closePopover();
            },
            'data-test-subj': panelItem['data-test-subj'],
          })),
        });
        continue;
      }

      rootItems.push({
        name: link.label,
        icon: link.iconType ? (
          <EuiIcon type={link.iconType} size="m" aria-hidden={true} />
        ) : undefined,
        href: link.href || undefined,
        onClick: (event) => {
          link.onClick?.(event);
          closePopover();
        },
        'data-test-subj': `userMenuLink__${link.label}`,
      });
    }

    rootItems.push({
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
      icon: <EuiIcon type="logOut" size="m" aria-hidden={true} />,
      href: logoutUrl,
      'data-test-subj': 'logoutLink',
    });

    return [
      {
        id: 0,
        title: displayName,
        items: rootItems,
      },
      ...nestedPanels,
    ];
  }, [closePopover, displayName, editProfileUrl, logoutUrl, user?.isAnonymous, userMenuLinks]);

  return (
    <EuiPopover
      ownFocus
      button={button}
      isOpen={isPopoverOpen}
      anchorPosition="downRight"
      repositionOnScroll
      closePopover={closePopover}
      panelPaddingSize="none"
      buffer={0}
      aria-label={i18n.translate('xpack.security.navControlComponent.popoverAriaLabel', {
        defaultMessage: 'Account menu',
      })}
    >
      <EuiContextMenu
        className="chrNavControl__userMenu"
        initialPanelId={0}
        panels={panels}
        data-test-subj="userMenu"
      />
    </EuiPopover>
  );
};
