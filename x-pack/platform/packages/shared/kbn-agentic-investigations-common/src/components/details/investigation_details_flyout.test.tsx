/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import {
  InvestigationDetailsFlyout,
  type InvestigationDetailsFlyoutProps,
} from './investigation_details_flyout';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  summary: 'A second sign-in replayed the same session cookie.',
  pendingProposalCount: 0,
  events: [],
};

const renderFlyout = (overrides: Partial<InvestigationDetailsFlyoutProps> = {}) => {
  const props: InvestigationDetailsFlyoutProps = {
    investigation,
    isLoading: false,
    selectedTab: 'overview',
    onSelectTab: jest.fn(),
    onClose: jest.fn(),
    onOpenChat: jest.fn(),
    ...overrides,
  };
  renderWithKibanaRenderContext(<InvestigationDetailsFlyout {...props} />);
  return props;
};

describe('InvestigationDetailsFlyout', () => {
  it('shows skeleton content while the investigation is loading', () => {
    renderFlyout({ investigation: undefined, isLoading: true });

    expect(screen.getByTestId('investigationDetailsFlyoutHeaderSkeleton')).toBeInTheDocument();
    expect(screen.getByTestId('investigationDetailsFlyoutBodySkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationFlyoutOpenChat')).not.toBeInTheDocument();
  });

  it('offers close and share along the top of the flyout', () => {
    const { onClose } = renderFlyout();

    expect(screen.getByTestId('investigationDetailsFlyoutShare')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('investigationDetailsFlyoutClose'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps close reachable while the investigation is still loading', () => {
    const { onClose } = renderFlyout({ investigation: undefined, isLoading: true });

    fireEvent.click(screen.getByTestId('investigationDetailsFlyoutClose'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the investigation once loaded', () => {
    renderFlyout();

    expect(screen.getByText('Impossible travel — exec account')).toBeInTheDocument();
    expect(screen.getByTestId('investigationFlyoutOpenChat')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationDetailsFlyoutBodySkeleton')).not.toBeInTheDocument();
  });

  it('shows the tab named by selectedTab', () => {
    renderFlyout({ selectedTab: 'timeline' });

    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to overview for a tab this host cannot render', () => {
    renderFlyout({ selectedTab: 'attachments' });

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reports tab changes rather than owning them', () => {
    const { onSelectTab } = renderFlyout();

    fireEvent.click(screen.getByRole('tab', { name: 'Timeline' }));

    expect(onSelectTab).toHaveBeenCalledWith('timeline');
  });
});
