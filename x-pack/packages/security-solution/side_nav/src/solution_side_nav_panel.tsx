/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiListGroup,
  EuiListGroupItem,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiWindowEvent,
  keys,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  type LinkCategories,
  isAccordionLinkCategory,
  isTitleLinkCategory,
  isSeparatorLinkCategory,
} from '@kbn/security-solution-navigation';
import type { SolutionSideNavItem } from './types';
import { BetaBadge } from './beta_badge';
import { TELEMETRY_EVENT } from './telemetry/const';
import { useTelemetryContext } from './telemetry/telemetry_context';
import {
  SolutionSideNavPanelStyles,
  panelClass,
  SolutionSideNavCategoryTitleStyles,
  SolutionSideNavTitleStyles,
  SolutionSideNavCategoryAccordionStyles,
  SolutionSideNavPanelLinksGroupStyles,
} from './solution_side_nav_panel.styles';

export interface SolutionSideNavPanelProps {
  onClose: () => void;
  onOutsideClick: () => void;
  title: string;
  items: SolutionSideNavItem[];
  categories?: LinkCategories;
  bottomOffset?: string;
  topOffset?: string;
}
/**
 * Renders the secondary navigation panel for the nested link items
 */
export const SolutionSideNavPanel: React.FC<SolutionSideNavPanelProps> = React.memo(
  function SolutionSideNavPanel({
    onClose,
    onOutsideClick,
    title,
    categories,
    items,
    bottomOffset,
    topOffset,
  }) {
    const { euiTheme } = useEuiTheme();
    const isLargerBreakpoint = useIsWithinMinBreakpoint('l');

    // Only larger breakpoint needs to add bottom offset, other sizes should have full height
    const $bottomOffset = isLargerBreakpoint ? bottomOffset : undefined;
    const $topOffset = isLargerBreakpoint ? topOffset : undefined;
    const hasShadow = !$bottomOffset;

    const solutionSideNavPanelStyles = SolutionSideNavPanelStyles(euiTheme, {
      $bottomOffset,
      $topOffset,
    });
    const panelClasses = classNames(panelClass, 'eui-yScroll', solutionSideNavPanelStyles);
    const titleClasses = classNames(SolutionSideNavTitleStyles(euiTheme));

    // ESC key closes PanelNav
    const onKeyDown = useCallback(
      (ev: KeyboardEvent) => {
        if (ev.key === keys.ESCAPE) {
          onClose();
        }
      },
      [onClose]
    );

    return (
      <>
        <EuiWindowEvent event="keydown" handler={onKeyDown} />
        <EuiPortal>
          <EuiFocusTrap autoFocus>
            <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
              <EuiPanel
                className={panelClasses}
                hasShadow={hasShadow}
                borderRadius="none"
                paddingSize="m"
                data-test-subj="solutionSideNavPanel"
              >
                <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
                  <EuiFlexItem>
                    <EuiTitle size="xs" className={titleClasses}>
                      <strong>{title}</strong>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem style={{ width: '100%' }}>
                    {categories ? (
                      <SolutionSideNavPanelCategories
                        categories={categories}
                        items={items}
                        onClose={onClose}
                      />
                    ) : (
                      <SolutionSideNavPanelItems items={items} onClose={onClose} />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiOutsideClickDetector>
          </EuiFocusTrap>
        </EuiPortal>
      </>
    );
  }
);

interface SolutionSideNavPanelCategoriesProps {
  categories: LinkCategories;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders all the categories for the secondary navigation panel.
 * Links that do not belong to any category are ignored
 */
const SolutionSideNavPanelCategories: React.FC<SolutionSideNavPanelCategoriesProps> = React.memo(
  function SolutionSideNavPanelCategories({ categories, items, onClose }) {
    return (
      <>
        {categories.map((category, index) => {
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

          if (isTitleLinkCategory(category)) {
            return (
              <SolutionSideNavPanelTitleCategory
                label={category.label}
                items={categoryItems}
                onClose={onClose}
                key={category.label}
              />
            );
          }
          if (isAccordionLinkCategory(category)) {
            return (
              <SolutionSideNavPanelAccordionCategory
                label={category.label}
                items={categoryItems}
                onClose={onClose}
                key={category.label}
              />
            );
          }
          if (isSeparatorLinkCategory(category)) {
            return (
              <SolutionSideNavPanelSeparatorCategory
                items={categoryItems}
                onClose={onClose}
                key={index}
              />
            );
          }
          return null;
        })}
      </>
    );
  }
);

interface SolutionSideNavPanelTitleCategoryProps {
  label: string;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders a title category for the secondary navigation panel.
 */
const SolutionSideNavPanelTitleCategory: React.FC<SolutionSideNavPanelTitleCategoryProps> =
  React.memo(function SolutionSideNavPanelTitleCategory({ label, onClose, items }) {
    const { euiTheme } = useEuiTheme();
    const titleClasses = classNames(SolutionSideNavCategoryTitleStyles(euiTheme));
    return (
      <>
        <EuiSpacer size="m" />
        <EuiTitle size="xxxs" className={titleClasses}>
          <h2>{label}</h2>
        </EuiTitle>
        <SolutionSideNavPanelItems items={items} onClose={onClose} />
        <EuiSpacer size="s" />
      </>
    );
  });

interface SolutionSideNavPanelAccordionCategoryProps {
  label: string;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders an accordion category for the secondary navigation panel.
 */
const SolutionSideNavPanelAccordionCategory: React.FC<SolutionSideNavPanelAccordionCategoryProps> =
  React.memo(function SolutionSideNavPanelAccordionCategory({ label, onClose, items }) {
    const { euiTheme } = useEuiTheme();
    const accordionClasses = classNames(SolutionSideNavCategoryAccordionStyles(euiTheme));
    return (
      <EuiAccordion id={label} buttonContent={label} className={accordionClasses}>
        <SolutionSideNavPanelItems items={items} onClose={onClose} />
      </EuiAccordion>
    );
  });

interface SolutionSideNavPanelSeparatorCategoryProps {
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders a separator category for the secondary navigation panel.
 */
const SolutionSideNavPanelSeparatorCategory: React.FC<SolutionSideNavPanelSeparatorCategoryProps> =
  React.memo(function SolutionSideNavPanelSeparatorCategory({ onClose, items }) {
    return (
      <>
        <EuiSpacer size="m" />
        <SolutionSideNavPanelItems items={items} onClose={onClose} />
        <EuiSpacer size="s" />
      </>
    );
  });

interface SolutionSideNavPanelItemsProps {
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders the items for the secondary navigation panel.
 */
const SolutionSideNavPanelItems: React.FC<SolutionSideNavPanelItemsProps> = React.memo(
  function SolutionSideNavPanelItems({ items, onClose }) {
    const { euiTheme } = useEuiTheme();
    const panelLinksGroupClassNames = classNames(SolutionSideNavPanelLinksGroupStyles(euiTheme));
    const panelLinkClassNames = classNames('solutionSideNavPanelLink');
    const { tracker } = useTelemetryContext();
    return (
      <EuiListGroup className={panelLinksGroupClassNames}>
        {items.map(({ id, href, onClick, label, iconType, isBeta, betaOptions }) => {
          const itemLabel = !isBeta ? (
            label
          ) : (
            <>
              {label} <BetaBadge text={betaOptions?.text} />
            </>
          );

          return (
            <EuiListGroupItem
              key={id}
              label={itemLabel}
              wrapText
              className={panelLinkClassNames}
              size="s"
              data-test-subj={`solutionSideNavPanelLink-${id}`}
              href={href}
              iconType={iconType}
              onClick={(ev) => {
                tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION}${id}`);
                onClose();
                onClick?.(ev);
              }}
            />
          );
        })}
      </EuiListGroup>
    );
  }
);
