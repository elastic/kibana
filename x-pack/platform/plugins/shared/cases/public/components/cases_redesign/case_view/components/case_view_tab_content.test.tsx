/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CaseViewTabContent } from './case_view_tab_content';
import { renderWithTestingProviders } from '../../../../common/mock';
import { basicCase } from '../../../../containers/mock';
import { CASE_VIEW_PAGE_TABS } from '../../../../../common/types';
import { useUrlParams } from '../../../../common/navigation';

jest.mock('../../../../common/navigation/hooks');
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../case_view/components/case_view_activity', () => ({
  CaseViewActivity: () => <div data-test-subj="case-view-activity" />,
}));
jest.mock('../../../case_view/components/case_view_attachments', () => ({
  CaseViewAttachments: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="case-view-attachments">{children}</div>
  ),
}));
jest.mock('../../../case_view/components/case_view_similar_cases', () => ({
  CaseViewSimilarCases: () => <div data-test-subj="case-view-similar-cases" />,
}));
jest.mock('../../../case_view/components/case_view_observables', () => ({
  CaseViewObservables: () => <div data-test-subj="case-view-observables" />,
}));

const useUrlParamsMock = useUrlParams as jest.Mock;

describe('CaseViewTabContent', () => {
  const defaultProps = {
    caseData: basicCase,
    searchTerm: '',
    onSearch: jest.fn(),
    onUpdateField: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders the attachments wrapper for alerts tab', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.ALERTS },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />, {
      wrapperProps: { features: { alerts: { enabled: true } } },
    });

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.ALERTS}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-attachments')).toBeInTheDocument();
  });

  it('renders the observables tab within attachments', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.OBSERVABLES },
    });

    renderWithTestingProviders(<CaseViewTabContent {...defaultProps} />);

    expect(
      await screen.findByTestId(`case-view-tab-content-${CASE_VIEW_PAGE_TABS.OBSERVABLES}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('case-view-attachments')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-observables')).toBeInTheDocument();
  });
});
