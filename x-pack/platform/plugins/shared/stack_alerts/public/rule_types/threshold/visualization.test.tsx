/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ThresholdVisualization } from './visualization';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public/types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import {
  builtInAggregationTypes,
  builtInComparators,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('./index_threshold_api', () => ({
  getThresholdRuleVisualizationData: jest.fn(() =>
    Promise.resolve({
      results: [
        { group: 'a', metrics: [['b', 2]] },
        { group: 'a', metrics: [['b', 10]] },
      ],
    })
  ),
}));

const { getThresholdRuleVisualizationData } = jest.requireMock('./index_threshold_api');

const dataMock = dataPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
dataMock.fieldFormats = {
  getDefaultInstance: jest.fn(() => ({
    convert: jest.fn((s: unknown) => JSON.stringify(s)),
  })),
} as unknown as DataPublicPluginStart['fieldFormats'];

describe('ThresholdVisualization', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: uiSettingsServiceMock.createSetupContract(),
        http: { post: jest.fn() },
      },
    });
    getThresholdRuleVisualizationData.mockImplementation(() =>
      Promise.resolve({
        results: [
          { group: 'a', metrics: [['b', 2]] },
          { group: 'a', metrics: [['b', 10]] },
        ],
      })
    );
  });

  const ruleParams = {
    index: 'test-index',
    aggType: 'count',
    thresholdComparator: '>',
    threshold: [0],
    timeWindowSize: 15,
    timeWindowUnit: 's',
  };

  function setup() {
    return renderWithI18n(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );
  }

  test('periodically requests visualization data', async () => {
    const refreshRate = 10;
    jest.useFakeTimers({ legacyFakeTimers: true });

    renderWithI18n(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
        refreshRateInMilliseconds={refreshRate}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(getThresholdRuleVisualizationData).toHaveBeenCalledTimes(1);

    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(refreshRate);
        await Promise.resolve();
      });
      expect(getThresholdRuleVisualizationData).toHaveBeenCalledTimes(i + 1);
    }

    jest.useRealTimers();
  });

  test('renders loading message on initial load', async () => {
    renderWithI18n(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );
    expect(screen.getByTestId('firstLoad')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('firstLoad')).not.toBeInTheDocument();
    });
    expect(getThresholdRuleVisualizationData).toHaveBeenCalled();
  });

  test('renders chart when visualization results are available', async () => {
    setup();

    await screen.findByTestId('alertVisualizationChart');
    expect(screen.queryByTestId('noDataCallout')).not.toBeInTheDocument();
  });

  test('renders error callout with message when getting visualization fails', async () => {
    const errorMessage = 'oh no';
    getThresholdRuleVisualizationData.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    );
    setup();

    await screen.findByTestId('errorCallout');

    expect(screen.getByTestId('errorCallout')).toHaveTextContent(
      `Cannot load alert visualization${errorMessage}`
    );
  });

  test('renders error callout even when unable to get message from error', async () => {
    getThresholdRuleVisualizationData.mockImplementation(() =>
      Promise.reject(new Error(undefined))
    );
    setup();

    await screen.findByTestId('errorCallout');

    expect(screen.getByTestId('errorCallout')).toHaveTextContent(`Cannot load alert visualization`);
  });

  test('renders no data message when visualization results are empty', async () => {
    getThresholdRuleVisualizationData.mockImplementation(() => Promise.resolve({ results: [] }));
    setup();

    await screen.findByTestId('alertVisualizationChart');
    expect(screen.getByTestId('noDataCallout')).toBeInTheDocument();
    expect(screen.getByTestId('noDataCallout')).toHaveTextContent(
      `No data matches this queryCheck that your time range and filters are correct.`
    );
  });

  test('passes projectRouting from CPS manager to getThresholdRuleVisualizationData', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: uiSettingsServiceMock.createSetupContract(),
        http: { post: jest.fn() },
        cps: {
          cpsManager: {
            getProjectRouting: jest.fn(() => '_alias:*'),
          },
        },
      },
    });

    await setup();

    expect(getThresholdRuleVisualizationData).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRouting: '_alias:*',
      })
    );
  });

  test('passes undefined projectRouting when CPS manager is absent', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: uiSettingsServiceMock.createSetupContract(),
        http: { post: jest.fn() },
      },
    });

    await setup();

    const firstCallArg = getThresholdRuleVisualizationData.mock.calls[0][0];
    expect(firstCallArg.projectRouting).toBeUndefined();
  });
});
