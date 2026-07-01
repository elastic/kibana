/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { CaseViewPageRedesign } from './case_view_page';
import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { useOnUpdateField } from '../../case_view/use_on_update_field';
import type { CaseViewPageRedesignProps } from './case_view_page';

jest.mock('../../case_view/use_on_update_field');
jest.mock('../../case_view/use_on_refresh_case_view_page');
jest.mock('../../use_breadcrumbs');

jest.mock('./components/case_details_header', () => ({
  CaseDetailsAppHeader: () => <div data-test-subj="case-details-app-header" />,
}));

jest.mock('../../case_view/metrics', () => ({
  CaseViewMetrics: () => <div data-test-subj="case-view-metrics" />,
}));

jest.mock('./components/case_view_tab_content', () => ({
  CaseViewTabContent: () => <div data-test-subj="case-view-tab-content" />,
}));

(useOnUpdateField as jest.Mock).mockReturnValue({
  isLoading: false,
  onUpdateField: jest.fn(),
});

describe('CaseViewPageRedesign', () => {
  const defaultProps: CaseViewPageRedesignProps = {
    caseData: basicCase,
    refreshRef: { current: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useOnUpdateField as jest.Mock).mockReturnValue({
      isLoading: false,
      onUpdateField: jest.fn(),
    });
  });

  it('renders the case details header', async () => {
    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} />);

    expect(await screen.findByTestId('case-details-app-header')).toBeInTheDocument();
  });

  it('renders the tab content', async () => {
    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} />);

    expect(await screen.findByTestId('case-view-tab-content')).toBeInTheDocument();
  });

  it('renders metrics by default', async () => {
    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} />);

    expect(await screen.findByTestId('case-view-metrics')).toBeInTheDocument();
  });

  it('sets the refreshRef', async () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} refreshRef={refreshRef} />);

    await waitFor(() => {
      expect(refreshRef.current).toEqual({ refreshCase: expect.any(Function) });
    });
  });
});
