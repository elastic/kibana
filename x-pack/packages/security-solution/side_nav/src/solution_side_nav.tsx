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
  EuiSpacer,
} from '@elastic/eui';
import partition from 'lodash/fp/partition';
import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import { SolutionSideNavPanel } from './solution_side_nav_panel';
import { LinkCategories, SeparatorLinkCategory, SolutionSideNavItemPosition } from './types';
import type { SolutionSideNavItem, Tracker } from './types';
import { TELEMETRY_EVENT } from './telemetry/const';
import { TelemetryContextProvider, useTelemetryContext } from './telemetry/telemetry_context';
import { SolutionSideNavItemStyles } from './solution_side_nav.styles';

export interface SolutionSideNavProps {
  /** All the items to display in the side navigation */
  items: SolutionSideNavItem[];
  /** The id of the selected item to highlight. It only affects the top level items rendered in the main panel */
  selectedId: string;
  /** The categories to group and separate the main items. Ignores `position: 'bottom'` items */
  categories?: SeparatorLinkCategory[];
  /** Css value for the bottom offset of the secondary panel. defaults to 0 */
  panelBottomOffset?: string;
  /** Css value for the top offset of the secondary panel. defaults to the generic kibana header height */
  panelTopOffset?: string;
  /**
   * The tracker function to enable navigation Telemetry, this has to be bound with the plugin `appId`
   * e.g.: usageCollection?.reportUiCounter?.bind(null, appId)
   * */
  tracker?: Tracker;
}
type ActivePanelNav = string | null;
/**
 * The Solution side navigation main component
 */
export const SolutionSideNav: React.FC<SolutionSideNavProps> = React.memo(function SolutionSideNav({
  items,
  categories,
  selectedId,
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

  const [topItems, bottomItems] = useMemo(
    () =>
      partition(
        ({ position = SolutionSideNavItemPosition.top }) =>
          position === SolutionSideNavItemPosition.top,
        items
      ),
    [items]
  );

  return (
    <TelemetryContextProvider tracker={tracker}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiListGroup gutterSize="none">
                <SolutionSideNavItems
                  items={topItems}
                  categories={categories}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiListGroup gutterSize="none">
                <SolutionSideNavItems
                  items={bottomItems}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <SolutionSideNavPanels
        items={items}
        activePanelNavId={activePanelNavId}
        onClose={onClosePanelNav}
        onOutsideClick={onOutsidePanelClick}
        bottomOffset={panelBottomOffset}
        topOffset={panelTopOffset}
      />
    </TelemetryContextProvider>
  );
});

interface SolutionSideNavItemsProps {
  items: SolutionSideNavItem[];
  selectedId: string;
  activePanelNavId: ActivePanelNav;
  isMobileSize: boolean;
  onOpenPanelNav: (id: string) => void;
  categories?: LinkCategories;
}
/**
 * The Solution side navigation items component.
 * Renders either the top or bottom panel items, considering the categories if present.
 * When `categories` is received all links that do not belong to any category are ignored.
 */
const SolutionSideNavItems: React.FC<SolutionSideNavItemsProps> = React.memo(
  function SolutionSideNavItems({
    items,
    categories,
    selectedId,
    activePanelNavId,
    isMobileSize,
    onOpenPanelNav,
  }) {
    if (!categories?.length) {
      return (
        <>
          {items.map((item) => (
            <SolutionSideNavItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              isActive={activePanelNavId === item.id}
              isMobileSize={isMobileSize}
              onOpenPanelNav={onOpenPanelNav}
            />
          ))}
        </>
      );
    }

    return (
      <>
        {categories?.map((category) => {
          const categoryItems = category.linkIds.reduce<SolutionSideNavItem[]>((acc, linkId) => {
            const link = items.find((item) => item.id === linkId);
            if (link) {
              acc.push(link);
            }
            return acc;
          }, []);

          if (!categoryItems.length) {
            return null;
          }

          return (
            <>
              <EuiSpacer size="s" />
              {categoryItems.map((item) => (
                <SolutionSideNavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  isActive={activePanelNavId === item.id}
                  isMobileSize={isMobileSize}
                  onOpenPanelNav={onOpenPanelNav}
                />
              ))}
              <EuiSpacer size="s" />
            </>
          );
        })}
      </>
    );
  }
);

interface SolutionSideNavItemProps {
  item: SolutionSideNavItem;
  isSelected: boolean;
  isActive: boolean;
  onOpenPanelNav: (id: string) => void;
  isMobileSize: boolean;
}
/**
 * The Solution side navigation item component.
 * Renders a single item for the main side navigation panel,
 * and it adds a button to open the item secondary panel if needed.
 */
const SolutionSideNavItem: React.FC<SolutionSideNavItemProps> = React.memo(
  function SolutionSideNavItem({ item, isSelected, isActive, isMobileSize, onOpenPanelNav }) {
    const { euiTheme } = useEuiTheme();
    const { tracker } = useTelemetryContext();

    const { id, href, label, items, onClick, labelSize, iconType, appendSeparator } = item;

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

    const hasPanelNav = useMemo(
      () => !isMobileSize && items != null && items.length > 0,
      [items, isMobileSize]
    );

    const onLinkClicked: React.MouseEventHandler = useCallback(
      (ev) => {
        tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.NAVIGATION}${id}`);
        onClick?.(ev);
      },
      [id, onClick, tracker]
    );

    const onButtonClick: React.MouseEventHandler = useCallback(
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${id}`);
        onOpenPanelNav(id);
      },
      [id, onOpenPanelNav, tracker]
    );

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

interface SolutionSideNavPanelsProps {
  items: SolutionSideNavItem[];
  activePanelNavId: ActivePanelNav;
  onClose: () => void;
  onOutsideClick: () => void;
  bottomOffset?: string;
  topOffset?: string;
}
type NavItemsById = Record<
  string,
  {
    title: string;
    panelItems: SolutionSideNavItem[];
    categories?: LinkCategories;
  }
>;
/**
 * The Solution side navigation panels component.
 * Renders the proper the secondary panel according to the `activePanelNavId` received.
 */
const SolutionSideNavPanels: React.FC<SolutionSideNavPanelsProps> = React.memo(
  function SolutionSideNavPanels({
    items,
    activePanelNavId,
    onClose,
    onOutsideClick,
    bottomOffset,
    topOffset,
  }) {
    const navItemsById = useMemo<NavItemsById>(
      () =>
        items.reduce<NavItemsById>((acc, navItem) => {
          if (navItem.items?.length) {
            acc[navItem.id] = {
              title: navItem.label,
              panelItems: navItem.items,
              categories: navItem.categories,
            };
          }
          return acc;
        }, {}),
      [items]
    );

    if (activePanelNavId == null || !navItemsById[activePanelNavId]) {
      return null;
    }
    const { panelItems, title, categories } = navItemsById[activePanelNavId];
    return (
      <SolutionSideNavPanel
        onClose={onClose}
        onOutsideClick={onOutsideClick}
        items={panelItems}
        title={title}
        categories={categories}
        bottomOffset={bottomOffset}
        topOffset={topOffset}
      />
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default SolutionSideNav;
