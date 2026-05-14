/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
    EuiFlyout,
    type EuiFlyoutProps,
    EuiFlyoutHeader,
    EuiFlexGroup,
    EuiFlexItem,
    EuiTab,
    EuiTabs,
    EuiTitle,
    useEuiTheme,
    useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface FlyoutHeaderTab<TId extends string> {
  id: TId;
  label: string;
}

/** At least one tab so the flyout always has a valid selected tab id. */
export type NonEmptyFlyoutTabs<TId extends string> = readonly [
  FlyoutHeaderTab<TId>,
  ...FlyoutHeaderTab<TId>[]
];

export interface FlyoutWithTabsProps<TId extends string> {
  title: string;
  tabsAriaLabel: string;
  tabs: NonEmptyFlyoutTabs<TId>;
  initialTabId?: TId;
  onClose: () => void;
  size?: number;
  type?: EuiFlyoutProps['type'];
  children: (selectedTabId: TId) => React.ReactNode;
}

export const FlyoutWithTabs = <TId extends string>({
  title,
  tabsAriaLabel,
  tabs,
  initialTabId,
  onClose,
  size = 400,
  type = 'push',
  children,
}: FlyoutWithTabsProps<TId>) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'flyoutWithTabs' });
  const { euiTheme } = useEuiTheme();
  const [selectedTab, setSelectedTab] = useState<TId | undefined>(
    () => initialTabId ?? tabs[0]?.id
  );

  if (!tabs.length) {
    throw new Error('FlyoutWithTabs requires at least one tab.');
  }

  const resolvedSelectedTab =
    selectedTab !== undefined && tabs.some(({ id }) => id === selectedTab)
      ? selectedTab
      : tabs[0].id;

  const headerStyles = css`
    padding: ${euiTheme.size.l} ${euiTheme.size.l} 0;
  `;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      /**
       * Push flyouts do not get EUI's default `role="dialog"` (see `announcesAsModal` in
       * EuiFlyout). Without an explicit role, `aria-labelledby` on the root is invalid for
       * assistive tech and fails automated a11y checks.
       */
      role="region"
      size={size}
      ownFocus
      paddingSize="none"
      type={type}
      flyoutMenuProps={{ title }}
      data-test-subj="flyoutWithTabs"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false} css={headerStyles}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTabs size="m" bottomBorder={false} aria-label={tabsAriaLabel}>
              {tabs.map(({ id, label }) => (
                <EuiTab
                  key={id}
                  isSelected={resolvedSelectedTab === id}
                  onClick={() => setSelectedTab(id)}
                  data-test-subj={`flyoutTab-${id}`}
                >
                  {label}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {children(resolvedSelectedTab)}
    </EuiFlyout>
  );
};
