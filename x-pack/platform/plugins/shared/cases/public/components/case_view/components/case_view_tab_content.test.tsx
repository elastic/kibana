/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { screen } from '@testing-library/react';

import { CaseViewTabContent } from './case_view_tab_content';
import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useUrlParams } from '../../../common/navigation';

vi.mock('../../../common/navigation/hooks');
vi.mock('../../../common/lib/kibana');

vi.mock('./activity/case_view_activity', () => {
      const mocked = {
      CaseViewActivity: () => <div data-test-subj="case-view-activity" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./case_view_attachments', () => {
      const mocked = {
      CaseViewAttachments: () => <div data-test-subj="case-view-attachments" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./case_view_similar_cases', () => {
      const mocked = {
      CaseViewSimilarCases: () => <div data-test-subj="case-view-similar-cases" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./sidebar/case_view_sidebar', () => {
      const mocked = {
      CaseViewSidebar: () => <div data-test-subj="case-view-page-sidebar" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./sidebar/sidebar_toggle_button', () => {
      const mocked = {
      SidebarToggleButton: () => <div data-test-subj="case-view-sidebar-toggle" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../case_view_tabs', () => {
      const mocked = {
      CaseViewTabs: () => <div data-test-subj="case-view-tabs" />,
    };
      return { ...mocked, default: mocked };
    });

const useUrlParamsMock = useUrlParams as Mock;

describe('CaseViewTabContent', () => {
  const defaultProps = {
    caseData: basicCase,
    searchTerm: '',
    onSearch: vi.fn(),
    onUpdateField: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUrlParamsMock.mockReturnValue({ urlParams: {} });
  });

  it('renders the activity tab by default', async () => {
    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ACTIVITY}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-activity')).toBeInTheDocument();
  });

  it('renders the similar cases tab', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.SIMILAR_CASES },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.SIMILAR_CASES}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-similar-cases')).toBeInTheDocument();
  });

  it('renders the attachments tab', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.ATTACHMENTS },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ATTACHMENTS}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-attachments')).toBeInTheDocument();
  });

  it('does not render activity or similar cases when on attachments tab', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.ATTACHMENTS },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ATTACHMENTS}`);
    expect(screen.queryByTestId('case-view-activity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-similar-cases')).not.toBeInTheDocument();
  });

  it('falls back to activity tab for unknown tabId values', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: 'non-existent-tab' },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ACTIVITY}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-activity')).toBeInTheDocument();
  });

  it('renders the sidebar on every tab', async () => {
    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(await screen.findByTestId('case-view-page-sidebar')).toBeInTheDocument();
  });

  it('renders the CaseViewTabs component', async () => {
    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
  });

  it('renders the sidebar alongside the attachments tab', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.ATTACHMENTS },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(await screen.findByTestId('case-view-attachments')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-page-sidebar')).toBeInTheDocument();
  });

  it('hides the sidebar visually, without unmounting it, when localStorage has sidebarOpen set to false', async () => {
    localStorage.setItem(`${basicCase.owner}.cases.caseView.sidebarOpen`, JSON.stringify(false));

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ACTIVITY}`);
    // Stays mounted (not removed from the DOM) so that any pending, unconfirmed field edits
    // inside it survive collapsing the whole sidebar, the same way they already survive
    // collapsing a single accordion section.
    expect(screen.getByTestId('case-view-page-sidebar')).not.toBeVisible();
  });
});
