/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseMetrics } from '../../../containers/use_get_case_metrics';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../../common/ui/types';
import { caseViewSectionRegistry } from '../../../client/case_view_sections';
import { CaseScope } from './case_scope';

jest.mock('../../../containers/use_get_case_metrics');
jest.mock('../../../common/use_cases_features');
jest.mock('../../../common/navigation/hooks');

const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

const observable = (typeKey: string, value: string) => ({
  id: `${typeKey}-${value}`,
  typeKey,
  value,
  description: null,
  createdAt: '2026-11-06T10:00:00.000Z',
  updatedAt: '2026-11-06T10:00:00.000Z',
});

const caseData = {
  ...basicCase,
  observables: [
    ...Array.from({ length: 5 }, (_, i) => observable('observable-type-ipv4', `10.0.0.${i}`)),
    ...Array.from({ length: 3 }, (_, i) => observable('observable-type-domain', `d${i}.net`)),
    observable('observable-type-url', 'http://x'),
    observable('observable-type-email', 'a@b.c'),
    observable('observable-type-file-path', 'C:\\x'),
  ],
} as unknown as CaseUI;

const render = ({ observables = true } = {}) => {
  useGetCaseMetricsMock.mockReturnValue({
    isLoading: false,
    data: {
      metrics: {
        alerts: {
          count: 7,
          hosts: {
            total: 2,
            values: [
              { id: 'h1', name: 'fin-ws-07', count: 5 },
              { id: 'h2', name: 'dc-01', count: 2 },
            ],
          },
          users: { total: 1, values: [{ name: 'jdoe', count: 7 }] },
        },
        connectors: { total: 1 },
      },
    },
  });
  useCasesFeaturesMock.mockReturnValue({
    metricsFeatures: [
      CaseMetricsFeature.ALERTS_COUNT,
      CaseMetricsFeature.ALERTS_HOSTS,
      CaseMetricsFeature.ALERTS_USERS,
      CaseMetricsFeature.CONNECTORS,
    ],
    observablesAuthorized: observables,
    isObservablesFeatureEnabled: observables,
  });
  return renderWithTestingProviders(<CaseScope caseData={caseData} />);
};

describe('CaseScope', () => {
  beforeAll(() => {
    caseViewSectionRegistry.register({
      id: 'test.impact',
      position: 'impact',
      getEntities: () => [
        { type: 'host', name: 'fin-ws-07' },
        { type: 'user', name: 'svc_backup' },
      ],
    });
  });

  it('merges registered impact with the alerts, without repeats, and shows the top three', () => {
    render();

    const impacted = screen.getByTestId('case-view-scope-impacted');
    expect(impacted).toHaveTextContent('2 hosts · 2 users');
    expect(screen.getAllByTestId('case-view-scope-entity').map((e) => e.textContent)).toEqual([
      'fin-ws-07',
      'svc_backup',
      'dc-01',
    ]);
    expect(screen.getByTestId('case-view-scope-impacted-more')).toHaveTextContent('+1 more');
  });

  it('counts observables by type, shows the four most common, and opens the Observables list', () => {
    const navigateToCaseView = useCaseViewNavigationMock().navigateToCaseView;
    render();

    expect(screen.getByTestId('case-view-scope-indicators')).toHaveTextContent('11 observables');
    expect(screen.getByTestId('case-view-scope-type-observable-type-ipv4')).toHaveTextContent(
      'IPv4 · 5'
    );
    expect(screen.getByTestId('case-view-scope-indicators')).toHaveTextContent('+1 more type');

    fireEvent.click(screen.getByTestId('case-view-scope-type-observable-type-ipv4'));
    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: caseData.id,
      tabId: CASE_VIEW_PAGE_TABS.OBSERVABLES,
    });
  });

  it('keeps the case activity as one compact line', () => {
    render();
    expect(screen.getByTestId('case-view-scope-activity')).toHaveTextContent(
      '7 alerts · 1 connector'
    );
  });

  it('hides indicators without the observables feature', () => {
    render({ observables: false });
    expect(screen.queryByTestId('case-view-scope-indicators')).not.toBeInTheDocument();
  });
});
