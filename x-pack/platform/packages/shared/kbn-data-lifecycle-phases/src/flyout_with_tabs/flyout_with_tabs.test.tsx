/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FlyoutWithTabs, type NonEmptyFlyoutTabs } from './flyout_with_tabs';

type TestTabId = 'summary' | 'json';

const tabs: NonEmptyFlyoutTabs<TestTabId> = [
  { id: 'summary', label: 'Summary' },
  { id: 'json', label: 'JSON' },
];

const renderFlyout = ({
  initialTabId,
  onBack,
  onClose = jest.fn(),
  showBackButton,
  titleAppend,
}: {
  initialTabId?: TestTabId;
  onBack?: () => void;
  onClose?: () => void;
  showBackButton?: boolean;
  titleAppend?: React.ReactNode;
} = {}) =>
  render(
    <FlyoutWithTabs
      title="Lifecycle policy"
      titleAppend={titleAppend}
      tabsAriaLabel="Lifecycle policy tabs"
      tabs={tabs}
      initialTabId={initialTabId}
      onBack={onBack}
      onClose={onClose}
      showBackButton={showBackButton}
    >
      {(selectedTabId) => <div data-test-subj="selectedTab">{selectedTabId}</div>}
    </FlyoutWithTabs>,
    { wrapper: EuiThemeProvider }
  );

describe('FlyoutWithTabs', () => {
  it('selects the initial tab and updates content when another tab is clicked', () => {
    renderFlyout({ initialTabId: 'summary' });

    expect(screen.getByTestId('selectedTab')).toHaveTextContent('summary');

    fireEvent.click(screen.getByTestId('flyoutTab-json'));

    expect(screen.getByTestId('selectedTab')).toHaveTextContent('json');
  });

  it('hides the back button by default', () => {
    renderFlyout();

    expect(screen.queryByTestId('flyoutWithTabsBackButton')).toBeNull();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = jest.fn();
    const onClose = jest.fn();

    renderFlyout({ showBackButton: true, onBack, onClose });

    fireEvent.click(screen.getByTestId('flyoutWithTabsBackButton'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to onClose when the back button is clicked without onBack', () => {
    const onClose = jest.fn();

    renderFlyout({ showBackButton: true, onClose });

    fireEvent.click(screen.getByTestId('flyoutWithTabsBackButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders titleAppend content next to the title when provided', () => {
    renderFlyout({
      titleAppend: <span data-test-subj="titleAppendContent">badge</span>,
    });

    expect(screen.getByTestId('titleAppendContent')).toBeInTheDocument();
  });

  it('does not render titleAppend wrapper when not provided', () => {
    renderFlyout();

    expect(screen.queryByTestId('titleAppendContent')).not.toBeInTheDocument();
  });

  it('moves focus into the push flyout when it opens (push flyouts get no EUI focus trap)', async () => {
    renderFlyout();

    await waitFor(() => expect(screen.getByTestId('flyoutWithTabs')).toHaveFocus());
  });
});
