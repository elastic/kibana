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
import { useGetCaseConnectors } from '../../../containers/use_get_case_connectors';
import { useDeleteCases } from '../../../containers/use_delete_cases';
import { useShouldDisableStatus } from '../../actions/status/use_should_disable_status';
import { useStatusAction } from '../../actions/status/use_status_action';
import { useGetTemplates } from '../../templates_v2/hooks/use_get_templates';
import { useChangeAppliedTemplate } from '../../case_view/use_change_applied_template';
import { useGetTemplate } from '../../templates_v2/hooks/use_get_template';
import type { CaseViewPageRedesignProps } from './case_view_page';

jest.mock('../../case_view/use_on_update_field');
jest.mock('../../case_view/use_on_refresh_case_view_page');
jest.mock('../../use_breadcrumbs');
jest.mock('../../../containers/use_get_case_connectors');
jest.mock('../../../containers/use_delete_cases');
jest.mock('../../actions/status/use_should_disable_status');
jest.mock('../../actions/status/use_status_action');
jest.mock('../../templates_v2/hooks/use_get_templates');
jest.mock('../../case_view/use_change_applied_template');
jest.mock('../../templates_v2/hooks/use_get_template');
jest.mock('../../../common/navigation/hooks');
jest.mock('../../../common/lib/kibana');

jest.mock('@kbn/app-header', () => ({
  AppHeader: ({ title, badges, menu }: { title: string; badges: unknown[]; menu: unknown }) => (
    <div data-test-subj="app-header">
      <span data-test-subj="app-header-title">{title}</span>
      <span data-test-subj="app-header-badges">{JSON.stringify(badges)}</span>
    </div>
  ),
}));

jest.mock('../../case_view/metrics', () => ({
  CaseViewMetrics: () => <div data-test-subj="case-view-metrics" />,
}));

jest.mock('./components/case_view_tab_content', () => ({
  CaseViewTabContent: () => <div data-test-subj="case-view-tab-content" />,
}));

jest.mock('./components/case_settings_popover', () => ({
  CaseSettingsPopover: () => <div data-test-subj="case-settings-popover" />,
}));

(useOnUpdateField as jest.Mock).mockReturnValue({
  isLoading: false,
  onUpdateField: jest.fn(),
});
(useGetCaseConnectors as jest.Mock).mockReturnValue({ data: {} });
(useDeleteCases as jest.Mock).mockReturnValue({ mutate: jest.fn() });
(useShouldDisableStatus as jest.Mock).mockReturnValue(() => false);
(useStatusAction as jest.Mock).mockReturnValue({ handleUpdateCaseStatus: jest.fn() });
(useGetTemplates as jest.Mock).mockReturnValue({ data: { templates: [] }, isLoading: false });
(useChangeAppliedTemplate as jest.Mock).mockReturnValue({ mutate: jest.fn() });
(useGetTemplate as jest.Mock).mockReturnValue({ data: null });

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
    (useGetCaseConnectors as jest.Mock).mockReturnValue({ data: {} });
    (useDeleteCases as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => false);
    (useStatusAction as jest.Mock).mockReturnValue({ handleUpdateCaseStatus: jest.fn() });
  });

  it('renders the app header', async () => {
    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} />);

    expect(await screen.findByTestId('app-header')).toBeInTheDocument();
  });

  it('renders the case title in the header', async () => {
    renderWithTestingProviders(<CaseViewPageRedesign {...defaultProps} />);

    expect(await screen.findByTestId('app-header-title')).toHaveTextContent(basicCase.title);
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
