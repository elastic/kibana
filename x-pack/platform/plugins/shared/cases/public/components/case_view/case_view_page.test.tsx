/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { useUrlParams } from '../../common/navigation/hooks';
import { CaseViewPage } from './case_view_page';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { caseData, caseViewProps } from './mocks';
import type { CaseViewPageProps } from './types';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments/migration_utils';
import { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';

jest.mock('../../common/navigation/hooks');
jest.mock('../use_breadcrumbs');
jest.mock('./use_on_refresh_case_view_page');
jest.mock('../../common/hooks');
jest.mock('../../common/lib/kibana');
jest.mock(
  '@kbn/response-ops-detections-close-reason',
  () => ({
    DEFAULT_CLOSING_REASON_OPTIONS: [],
    DEFAULT_DETECTIONS_CLOSE_REASONS_KEY: 'securitySolution:closeReason',
  }),
  { virtual: true }
);
jest.mock('../../../common/utils/attachments/migration_utils', () => {
  const actual = jest.requireActual('../../../common/utils/attachments/migration_utils');

  return {
    ...actual,
    toUnifiedAttachmentType: jest.fn(actual.toUnifiedAttachmentType),
  };
});

jest.mock('../header_page', () => ({
  HeaderPage: jest.fn(() => <div data-test-subj="test-case-view-header">{'Case view header'}</div>),
}));

jest.mock('./metrics', () => ({
  CaseViewMetrics: jest.fn(() => (
    <div data-test-subj="test-case-view-metrics">{'Case view metrics'}</div>
  )),
}));

jest.mock('./components/case_view_activity', () => ({
  CaseViewActivity: jest.fn(() => (
    <div data-test-subj="test-case-view-activity">{'Case view activity'}</div>
  )),
}));

jest.mock('./components/case_view_alerts', () => ({
  CaseViewAlerts: jest.fn(() => (
    <div data-test-subj="test-case-view-alerts">{'Case view alerts'}</div>
  )),
}));

jest.mock('./components/case_view_files', () => ({
  CaseViewFiles: jest.fn(() => (
    <div data-test-subj="test-case-view-files">{'Case view files'}</div>
  )),
}));

jest.mock('./components/case_view_observables', () => ({
  CaseViewObservables: jest.fn(() => (
    <div data-test-subj="test-case-view-observables">{'Case view observables'}</div>
  )),
}));

jest.mock('./components/case_view_similar_cases', () => ({
  CaseViewSimilarCases: jest.fn(() => (
    <div data-test-subj="test-case-view-similar-cases">{'Case view similar cases'}</div>
  )),
}));

const useUrlParamsMock = useUrlParams as jest.Mock;
const useCasesTitleBreadcrumbsMock = useCasesTitleBreadcrumbs as jest.Mock;
const toUnifiedAttachmentTypeMock = toUnifiedAttachmentType as jest.MockedFunction<
  typeof toUnifiedAttachmentType
>;

const caseProps: CaseViewPageProps = {
  ...caseViewProps,
  caseData,
  fetchCase: jest.fn(),
};

describe('CaseViewPage', () => {
  let unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    useUrlParamsMock.mockReturnValue({});
    unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
    unifiedAttachmentTypeRegistry.register({
      id: 'security.event',
      displayName: 'Event',
      icon: 'bell',
      getAttachmentViewObject: () => ({ event: 'added an event' }),
      getAttachmentTabViewObject: () => ({
        children: () => (
          <div data-test-subj="test-case-view-events-content">{'Events content'}</div>
        ),
      }),
      schemaValidator: () => {},
    });
  });

  it('shows the header section', async () => {
    renderWithTestingProviders(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-header')).toBeInTheDocument();
  });

  it('shows the metrics section', async () => {
    renderWithTestingProviders(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-metrics')).toBeInTheDocument();
  });

  it('shows the activity section', async () => {
    renderWithTestingProviders(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-activity')).toBeInTheDocument();
  });

  it('should set the breadcrumbs correctly', async () => {
    const onComponentInitialized = jest.fn();

    renderWithTestingProviders(
      <CaseViewPage {...caseProps} onComponentInitialized={onComponentInitialized} />
    );

    await waitFor(() => {
      expect(useCasesTitleBreadcrumbsMock).toHaveBeenCalledWith(caseProps.caseData.title);
    });
  });

  it('resolves event type using the full case owner', () => {
    const caseDataWithStringOwner = { ...caseProps.caseData, owner: 'securitySolution' };

    renderWithTestingProviders(<CaseViewPage {...caseProps} caseData={caseDataWithStringOwner} />);

    expect(toUnifiedAttachmentTypeMock).toHaveBeenCalledWith('event', 'securitySolution');
  });

  it('does not render the events tab content when events feature is disabled', () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.EVENTS },
    });

    renderWithTestingProviders(<CaseViewPage {...caseProps} />, {
      wrapperProps: {
        features: { events: { enabled: false } },
        unifiedAttachmentTypeRegistry,
      },
    });

    expect(screen.queryByTestId('test-case-view-events-content')).not.toBeInTheDocument();
  });

  it('renders the events tab content when events feature is enabled and type is registered', async () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.EVENTS },
    });

    renderWithTestingProviders(<CaseViewPage {...caseProps} />, {
      wrapperProps: {
        features: { events: { enabled: true } },
        unifiedAttachmentTypeRegistry,
      },
    });

    expect(await screen.findByTestId('test-case-view-events-content')).toBeInTheDocument();
  });
});
