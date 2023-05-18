/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiListGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useIsWithinBreakpoints,
  useEuiTheme,
  EuiListGroupItem,
  EuiHorizontalRule,
} from '@elastic/eui';

import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import { SolutionSideNavPanel } from './solution_side_nav_panel';
import type { LinkCategories, SolutionSideNavItem, Tracker } from './types';
import { TELEMETRY_EVENT } from './telemetry/const';
import { TelemetryContextProvider, useTelemetryContext } from './telemetry/telemetry_context';
import { SolutionSideNavItemStyles } from './solution_side_nav.styles';

export interface SolutionSideNavProps {
  items: SolutionSideNavItem[];
  selectedId: string;
  footerItems?: SolutionSideNavItem[];
  panelBottomOffset?: string;
  panelTopOffset?: string;
  // This enables Telemetry tracking inside side navigation, this has to be bound with the plugin appId
  // e.g.: usageCollection?.reportUiCounter?.bind(null, appId)
  tracker?: Tracker;
}
export interface SolutionSideNavItemsProps {
  items: SolutionSideNavItem[];
  selectedId: string;
  activePanelNavId: ActivePanelNav;
  isMobileSize: boolean;
  navItemsById: NavItemsById;
  onOpenPanelNav: (id: string) => void;
}
export interface SolutionSideNavItemProps {
  item: SolutionSideNavItem;
  isSelected: boolean;
  isActive: boolean;
  hasPanelNav: boolean;
  onOpenPanelNav: (id: string) => void;
}

type ActivePanelNav = string | null;
type NavItemsById = Record<
  string,
  { title: string; panelItems: SolutionSideNavItem[]; categories?: LinkCategories }
>;

export const SolutionSideNav: React.FC<SolutionSideNavProps> = React.memo(function SolutionSideNav({
  items,
  selectedId,
  footerItems = [],
  panelBottomOffset,
  panelTopOffset,
  tracker,
}) {
  const isMobileSize = useIsWithinBreakpoints(['xs', 's']);

  const [activePanelNavId, setActivePanelNavId] = useState<ActivePanelNav>(null);
  const activePanelNavIdRef = useRef<ActivePanelNav>(null);

  const openPanelNav = (id: string) => {
    activePanelNavIdRef.current = id;
    setActivePanelNavId(id);
  };

  const onClosePanelNav = useCallback(() => {
    activePanelNavIdRef.current = null;
    setActivePanelNavId(null);
  }, []);

  const onOutsidePanelClick = useCallback(() => {
    const currentPanelNavId = activePanelNavIdRef.current;
    setTimeout(() => {
      // This event is triggered on outside click.
      // Closing the side nav at the end of event loop to make sure it
      // closes also if the active panel button has been clicked (toggle),
      // but it does not close if any any other panel open button has been clicked.
      if (activePanelNavIdRef.current === currentPanelNavId) {
        onClosePanelNav();
      }
    });
  }, [onClosePanelNav]);

  const navItemsById = useMemo<NavItemsById>(
    () =>
      [...items, ...footerItems].reduce<NavItemsById>((acc, navItem) => {
        if (navItem.items?.length) {
          acc[navItem.id] = {
            title: navItem.label,
            panelItems: navItem.items,
            categories: navItem.categories,
          };
        }
        return acc;
      }, {}),
    [items, footerItems]
  );

  const panelNav = useMemo(() => {
    if (activePanelNavId == null || !navItemsById[activePanelNavId]) {
      return null;
    }
    const { panelItems, title, categories } = navItemsById[activePanelNavId];
    return (
      <SolutionSideNavPanel
        onClose={onClosePanelNav}
        onOutsideClick={onOutsidePanelClick}
        items={panelItems}
        title={title}
        categories={categories}
        bottomOffset={panelBottomOffset}
        topOffset={panelTopOffset}
      />
    );
  }, [
    activePanelNavId,
    navItemsById,
    onClosePanelNav,
    onOutsidePanelClick,
    panelBottomOffset,
    panelTopOffset,
  ]);

  return (
    <TelemetryContextProvider tracker={tracker}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiListGroup gutterSize="none">
                <SolutionSideNavItems
                  items={items}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiListGroup gutterSize="none">
                <SolutionSideNavItems
                  items={footerItems}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {panelNav}
    </TelemetryContextProvider>
  );
});

const SolutionSideNavItems: React.FC<SolutionSideNavItemsProps> = ({
  items,
  selectedId,
  activePanelNavId,
  isMobileSize,
  navItemsById,
  onOpenPanelNav,
}) => (
  <>
    {items.map((item) => (
      <SolutionSideNavItem
        key={item.id}
        item={item}
        isSelected={selectedId === item.id}
        isActive={activePanelNavId === item.id}
        hasPanelNav={!isMobileSize && item.id in navItemsById}
        onOpenPanelNav={onOpenPanelNav}
      />
    ))}
  </>
);

const SolutionSideNavItem: React.FC<SolutionSideNavItemProps> = React.memo(
  function SolutionSideNavItem({ item, isSelected, isActive, hasPanelNav, onOpenPanelNav }) {
    const { euiTheme } = useEuiTheme();
    const { tracker } = useTelemetryContext();

    const { id, href, label, onClick, labelSize, iconType, appendSeparator } = item;

    const onLinkClicked: React.MouseEventHandler = (ev) => {
      tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.NAVIGATION}${id}`);
      onClick?.(ev);
    };

    const solutionSideNavItemStyles = SolutionSideNavItemStyles(euiTheme);
    const itemClassNames = classNames(
      'solutionSideNavItem',
      {
        'solutionSideNavItem--isActive': isActive,
        'solutionSideNavItem--isPrimary': isSelected,
      },
      solutionSideNavItemStyles
    );
    const buttonClassNames = classNames('solutionSideNavItemButton');

    const onButtonClick: React.MouseEventHandler = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${id}`);
      onOpenPanelNav(id);
    };

    return (
      <>
        <EuiLink
          key={id}
          href={href}
          onClick={onLinkClicked}
          color={isSelected ? 'primary' : 'text'}
          data-test-subj={`solutionSideNavItemLink-${id}`}
        >
          <EuiListGroupItem
            className={itemClassNames}
            color={isSelected ? 'primary' : 'text'}
            label={label}
            size={labelSize ?? 's'}
            {...(iconType && {
              iconType,
              iconProps: {
                color: isSelected ? 'primary' : 'text',
              },
            })}
            {...(hasPanelNav && {
              extraAction: {
                className: buttonClassNames,
                color: isActive ? 'primary' : 'text',
                onClick: onButtonClick,
                iconType: 'spaces',
                iconSize: 'm',
                'aria-label': 'Toggle panel nav',
                'data-test-subj': `solutionSideNavItemButton-${id}`,
                alwaysShow: true,
              },
            })}
          />
        </EuiLink>
        {appendSeparator && <EuiHorizontalRule margin="xs" />}
      </>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default SolutionSideNav;
