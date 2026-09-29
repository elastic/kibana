/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { CaseViewPage } from './case_view_page';
import { renderWithTestingProviders } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import { useOnUpdateField } from './use_on_update_field';
import type { CaseViewPageComponentProps } from './case_view_page';

vi.mock('./use_on_update_field');
vi.mock('./use_on_refresh_case_view_page');
vi.mock('../use_breadcrumbs');

vi.mock('./components/case_details_header', () => {
      const mocked = {
      CaseDetailsAppHeader: () => <div data-test-subj="case-details-app-header" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./metrics', () => {
      const mocked = {
      CaseViewMetrics: () => <div data-test-subj="case-view-metrics" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/case_view_tab_content', () => {
      const mocked = {
      CaseViewTabContent: () => <div data-test-subj="case-view-tab-content" />,
    };
      return { ...mocked, default: mocked };
    });

(useOnUpdateField as Mock).mockReturnValue({
  isLoading: false,
  onUpdateField: vi.fn(),
});

describe('CaseViewPage', () => {
  const defaultProps: CaseViewPageComponentProps = {
    caseData: basicCase,
    refreshRef: { current: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useOnUpdateField as Mock).mockReturnValue({
      isLoading: false,
      onUpdateField: vi.fn(),
    });
  });

  it('renders the case details header', async () => {
    renderWithTestingProviders(<CaseViewPage {...defaultProps} />);

    expect(await screen.findByTestId('case-details-app-header')).toBeInTheDocument();
  });

  it('renders the tab content', async () => {
    renderWithTestingProviders(<CaseViewPage {...defaultProps} />);

    expect(await screen.findByTestId('case-view-tab-content')).toBeInTheDocument();
  });

  it('renders metrics by default', async () => {
    renderWithTestingProviders(<CaseViewPage {...defaultProps} />);

    expect(await screen.findByTestId('case-view-metrics')).toBeInTheDocument();
  });

  it('sets the refreshRef', async () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    renderWithTestingProviders(<CaseViewPage {...defaultProps} refreshRef={refreshRef} />);

    await waitFor(() => {
      expect(refreshRef.current).toEqual({ refreshCase: expect.any(Function) });
    });
  });
});
