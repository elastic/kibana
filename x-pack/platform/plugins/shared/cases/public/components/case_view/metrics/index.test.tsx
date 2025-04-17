/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import {
  basicCaseMetrics,
  basicCaseNumericValueFeatures,
  basicCaseStatusFeatures,
} from '../../../containers/mock';
import { CaseViewMetrics } from '.';
import type { SingleCaseMetrics, SingleCaseMetricsFeature } from '../../../../common/ui';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseMetrics } from '../../../containers/use_get_case_metrics';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { CaseMetricsFeature } from '../../../../common/types/api';

jest.mock('../../../containers/use_get_case_metrics');
jest.mock('../../../common/use_cases_features');

const useFetchCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;

const renderCaseMetrics = ({
  metrics = basicCaseMetrics,
  features = [...basicCaseNumericValueFeatures, ...basicCaseStatusFeatures],
  isLoading = false,
}: {
  metrics?: SingleCaseMetrics;
  features?: SingleCaseMetricsFeature[];
  isLoading?: boolean;
} = {}) => {
  useFetchCaseMetricsMock.mockImplementation(() => ({
    data: { metrics },
    isLoading,
  }));

  useCasesFeaturesMock.mockReturnValue({ metricsFeatures: features });
  return renderWithTestingProviders(<CaseViewMetrics caseId={'1234'} />);
};

interface FeatureTest {
  feature: SingleCaseMetricsFeature;
  items: Array<{
    title: string;
    value: string | number;
  }>;
}

const metricsFeaturesTests: FeatureTest[] = [
  {
    feature: CaseMetricsFeature.ALERTS_COUNT,
    items: [{ title: 'Total alerts', value: basicCaseMetrics.alerts!.count! }],
  },
  {
    feature: CaseMetricsFeature.ALERTS_USERS,
    items: [{ title: 'Associated users', value: basicCaseMetrics.alerts!.users!.total! }],
  },
  {
    feature: CaseMetricsFeature.ALERTS_HOSTS,
    items: [{ title: 'Associated hosts', value: basicCaseMetrics.alerts!.hosts!.total! }],
  },
  {
    feature: CaseMetricsFeature.ACTIONS_ISOLATE_HOST,
    items: [
      {
        title: 'Isolated hosts',
        value:
          basicCaseMetrics.actions!.isolateHost!.isolate.total -
          basicCaseMetrics.actions!.isolateHost!.unisolate.total,
      },
    ],
  },
  {
    feature: CaseMetricsFeature.CONNECTORS,
    items: [{ title: 'Total connectors', value: basicCaseMetrics.connectors!.total! }],
  },
  {
    feature: CaseMetricsFeature.LIFESPAN,
    items: [
      {
        title: 'Case created',
        value: '2020-02-19T23:06:33Z',
      },
      {
        title: 'In progress duration',
        value: '20 milliseconds',
      },
      {
        title: 'Open duration',
        value: '10 milliseconds',
      },
      {
        title: 'Duration from creation to close',
        value: '1 day',
      },
    ],
  },
];

describe('CaseViewMetrics', () => {
  it('should render', () => {
    renderCaseMetrics();
    expect(screen.getByTestId('case-view-metrics-panel')).toBeInTheDocument();
  });

  it('should render loading spinner', () => {
    renderCaseMetrics({ isLoading: true });
    expect(screen.getByTestId('case-view-metrics-spinner')).toBeInTheDocument();
  });

  it('should render metrics with default value 0', async () => {
    renderCaseMetrics({
      metrics: {},
      features: basicCaseNumericValueFeatures,
    });

    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(basicCaseNumericValueFeatures.length);
    });
  });

  it('should render status metrics with default value of a dash', () => {
    renderCaseMetrics({ metrics: {} });
    // \u2014 is the unicode for a long dash
    expect(screen.getAllByText('\u2014')).toHaveLength(3);
  });

  it('should not render if no features are returned', () => {
    renderCaseMetrics({ features: [] });
    expect(screen.queryByTestId('case-view-metrics-panel')).not.toBeInTheDocument();
  });

  it('should render open to close duration with the icon when it is reopened', () => {
    renderCaseMetrics({
      metrics: {
        lifespan: {
          creationDate: new Date(0).toISOString(),
          closeDate: new Date(2).toISOString(),
          statusInfo: {
            inProgressDuration: 20,
            openDuration: 10,
            reopenDates: [new Date(1).toISOString()],
          },
        },
      },
    });

    expect(screen.getByText('2 milliseconds (reopened)')).toBeInTheDocument();
    expect(screen.getByTestId('case-metrics-lifespan-reopen-icon')).toBeInTheDocument();
  });

  it('should not render open to close duration with the icon when it is not reopened', () => {
    renderCaseMetrics({
      metrics: {
        lifespan: {
          creationDate: new Date(0).toISOString(),
          closeDate: new Date(2).toISOString(),
          statusInfo: {
            inProgressDuration: 20,
            openDuration: 10,
            reopenDates: [],
          },
        },
      },
    });

    expect(screen.getByText('2 milliseconds')).toBeInTheDocument();
    expect(screen.queryByTestId('case-metrics-lifespan-reopen-icon')).not.toBeInTheDocument();
  });

  it('should prevent negative value for isolateHost actions', () => {
    const incosistentMetrics = {
      actions: {
        isolateHost: {
          isolate: { total: 1 },
          unisolate: { total: 2 },
        },
      },
    };

    renderCaseMetrics({
      metrics: incosistentMetrics,
      features: [CaseMetricsFeature.ACTIONS_ISOLATE_HOST],
    });
    expect(screen.getByText('Isolated hosts')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  describe.each(metricsFeaturesTests)('Metrics feature tests', ({ feature, items }) => {
    it(`should not render other metrics when rendering feature: ${feature}`, () => {
      renderCaseMetrics({ features: [feature] });
      metricsFeaturesTests.forEach(({ feature: otherFeature, items: otherItems }) => {
        if (feature !== otherFeature) {
          otherItems.forEach(({ title }) => {
            expect(screen.queryByText(title)).toBeNull();
          });
        }
      });
    });

    describe.each(items)(`Metric feature: ${feature} item: %s`, ({ title, value }) => {
      it('should render metric', () => {
        renderCaseMetrics({ features: [feature] });
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });
});
