/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiHorizontalRule,
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
import type { SolutionSideNavItem, LinkCategories } from './types';
import { BetaBadge } from './beta_badge';
import { TELEMETRY_EVENT } from './telemetry/const';
import { useTelemetryContext } from './telemetry/telemetry_context';
import {
  SolutionSideNavPanelStyles,
  panelClass,
  SolutionSideNavTitleStyles,
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
export interface SolutionSideNavPanelCategoriesProps {
  categories: LinkCategories;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
export interface SolutionSideNavPanelItemsProps {
  items: SolutionSideNavItem[];
  onClose: () => void;
}

/**
 * Renders the side navigation panel for secondary links
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
    const solutionSideNavTitleStyles = SolutionSideNavTitleStyles(euiTheme, { $paddingTop: true });
    const panelClasses = classNames(panelClass, 'eui-yScroll', solutionSideNavPanelStyles);
    const titleClasses = classNames(solutionSideNavTitleStyles);

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
        {/* <GlobalPanelStyle /> */}
        <EuiWindowEvent event="keydown" handler={onKeyDown} />
        <EuiPortal>
          <EuiFocusTrap autoFocus>
            <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
              <EuiPanel
                className={panelClasses}
                hasShadow={hasShadow}
                // $bottomOffset={bottomOffsetLargerBreakpoint}
                borderRadius="none"
                paddingSize="m"
                data-test-subj="solutionSideNavPanel"
              >
                <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
                  <EuiFlexItem>
                    <EuiTitle size="xs" className={titleClasses}>
                      <strong>{title}</strong>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionList>
                      {categories ? (
                        <SolutionSideNavPanelCategories
                          categories={categories}
                          items={items}
                          onClose={onClose}
                        />
                      ) : (
                        <SolutionSideNavPanelItems items={items} onClose={onClose} />
                      )}
                    </EuiDescriptionList>
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

const SolutionSideNavPanelCategories: React.FC<SolutionSideNavPanelCategoriesProps> = React.memo(
  function SolutionSideNavPanelCategories({ categories, items, onClose }) {
    const { euiTheme } = useEuiTheme();
    const sideNavTitleStyles = SolutionSideNavTitleStyles(euiTheme);
    const titleClasses = classNames(sideNavTitleStyles);

    return (
      <>
        {categories.map(({ label, linkIds }) => {
          const links = linkIds.reduce<SolutionSideNavItem[]>((acc, linkId) => {
            const link = items.find((item) => item.id === linkId);
            if (link) {
              acc.push(link);
            }
            return acc;
          }, []);

          if (!links.length) {
            return null;
          }

          return (
            <Fragment key={label}>
              <EuiTitle size="xxxs" className={titleClasses}>
                <h2>{label}</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <SolutionSideNavPanelItems items={links} onClose={onClose} />
              <EuiSpacer size="l" />
            </Fragment>
          );
        })}
      </>
    );
  }
);

const SolutionSideNavPanelItems: React.FC<SolutionSideNavPanelItemsProps> = React.memo(
  function SolutionSideNavPanelItems({ items, onClose }) {
    const panelLinkClassNames = classNames('solutionSideNavPanelLink');
    const panelLinkItemClassNames = classNames('solutionSideNavPanelLinkItem');
    const { tracker } = useTelemetryContext();
    return (
      <>
        {items.map(({ id, href, onClick, label, description, isBeta, betaOptions }) => (
          <a
            key={id}
            className={panelLinkClassNames}
            data-test-subj={`solutionSideNavPanelLink-${id}`}
            href={href}
            onClick={(ev) => {
              tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION}${id}`);
              onClose();
              onClick?.(ev);
            }}
          >
            <EuiPanel hasShadow={false} className={panelLinkItemClassNames} paddingSize="s">
              <EuiDescriptionListTitle>
                {label}
                {isBeta && <BetaBadge text={betaOptions?.text} />}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
            </EuiPanel>
          </a>
        ))}
      </>
    );
  }
);
