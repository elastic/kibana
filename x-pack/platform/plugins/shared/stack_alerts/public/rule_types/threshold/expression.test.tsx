/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import IndexThresholdRuleTypeExpression, { DEFAULT_VALUES } from './expression';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { IndexThresholdRuleParams } from './types';
import { validateExpression } from './validation';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import {
  builtInAggregationTypes,
  builtInComparators,
  getTimeUnitLabel,
} from '@kbn/triggers-actions-ui-plugin/public';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
    },
    getTimeFieldOptions: () => {
      return [
        {
          text: '@timestamp',
          value: '@timestamp',
        },
      ];
    },
    getIndexOptions: () => {
      return Promise.resolve([
        {
          label: 'indexOption',
          options: [
            {
              label: 'index1',
              value: 'index1',
            },
            {
              label: 'index2',
              value: 'index2',
            },
          ],
        },
      ]);
    },
  };
});

const dataMock = dataPluginMock.createStartContract();
const dataViewMock = {
  ...dataViewPluginMocks.createStartContract(),
  getFieldsForWildcard: jest.fn().mockResolvedValue([
    {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      isMapped: true,
    },
    {
      name: 'field',
      type: 'string',
      esTypes: ['text'],
      searchable: true,
      aggregatable: false,
      isMapped: true,
    },
  ]),
  getIndices: jest.fn().mockResolvedValue([]),
};
const chartsStartMock = chartPluginMock.createStartContract();

describe('IndexThresholdRuleTypeExpression', () => {
  function getAlertParams(overrides = {}) {
    return {
      index: 'test-index',
      aggType: 'count',
      thresholdComparator: '>',
      threshold: [0],
      timeWindowSize: 15,
      timeWindowUnit: 's',
      ...overrides,
    };
  }
  function setup(ruleParams: IndexThresholdRuleParams) {
    const { errors } = validateExpression(ruleParams);

    return render(
      <I18nProvider>
        <IndexThresholdRuleTypeExpression
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={ruleParams}
          setRuleParams={() => {}}
          setRuleProperty={() => {}}
          errors={errors}
          data={dataMock}
          dataViews={dataViewMock}
          defaultActionGroupId=""
          actionGroups={[]}
          charts={chartsStartMock}
          onChangeMetaData={() => {}}
        />
      </I18nProvider>
    );
  }

  test(`should render IndexThresholdRuleTypeExpression with expected components when aggType doesn't require field`, async () => {
    setup(getAlertParams());
    expect(screen.getByTestId('selectIndexExpression')).toBeInTheDocument();

    // Expression items are lazy-loaded; wait for them to render
    await screen.findByTestId('whenExpression');
    expect(screen.getByTestId('groupByExpression')).toBeInTheDocument();
    expect(screen.queryByTestId('ofExpressionPopover')).not.toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(screen.getByTestId('forLastExpression')).toBeInTheDocument();
    expect(screen.getByTestId('visualizationPlaceholder')).toBeInTheDocument();
    expect(screen.queryByTestId('thresholdVisualization')).not.toBeInTheDocument();
    expect(screen.getByTestId('filterKuery')).toBeInTheDocument();
  });

  test(`should render IndexThresholdRuleTypeExpression with expected components when aggType does require field`, async () => {
    setup(getAlertParams({ aggType: 'avg' }));
    expect(screen.getByTestId('selectIndexExpression')).toBeInTheDocument();

    // Expression items are lazy-loaded; wait for them to render
    await screen.findByTestId('whenExpression');
    expect(screen.getByTestId('ofExpressionPopover')).toBeInTheDocument();
    expect(screen.getByTestId('groupByExpression')).toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(screen.getByTestId('forLastExpression')).toBeInTheDocument();
    expect(screen.getByTestId('visualizationPlaceholder')).toBeInTheDocument();
    expect(screen.queryByTestId('thresholdVisualization')).not.toBeInTheDocument();
    expect(screen.getByTestId('filterKuery')).toBeInTheDocument();
  });

  test(`should render IndexThresholdRuleTypeExpression with visualization when there are no expression errors`, async () => {
    setup(getAlertParams({ timeField: '@timestamp' }));
    // Wait for lazy-loaded expression items to resolve (avoid act() warnings)
    await screen.findByTestId('whenExpression');
    // With a valid timeField, there are no expression errors, so visualizationPlaceholder is absent
    expect(screen.queryByTestId('visualizationPlaceholder')).not.toBeInTheDocument();
  });

  test(`should set default alert params when params are undefined`, () => {
    setup(
      getAlertParams({
        aggType: undefined,
        thresholdComparator: undefined,
        timeWindowSize: undefined,
        timeWindowUnit: undefined,
        groupBy: undefined,
        threshold: undefined,
      })
    );

    expect(screen.getByTestId('selectIndexExpression').textContent).toEqual('index test-index');
    expect(screen.getByTestId('whenExpression').textContent).toEqual(
      `when ${builtInAggregationTypes[DEFAULT_VALUES.AGGREGATION_TYPE].text}`
    );
    expect(screen.getByTestId('groupByExpression').textContent).toEqual(
      `over ${DEFAULT_VALUES.GROUP_BY} documents `
    );
    expect(screen.queryByTestId('ofExpressionPopover')).not.toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover').textContent).toEqual(
      `${builtInComparators[DEFAULT_VALUES.THRESHOLD_COMPARATOR].text} `
    );
    expect(screen.getByTestId('forLastExpression').textContent).toEqual(
      `for the last ${DEFAULT_VALUES.TIME_WINDOW_SIZE} ${getTimeUnitLabel(
        DEFAULT_VALUES.TIME_WINDOW_UNIT as TIME_UNITS,
        DEFAULT_VALUES.TIME_WINDOW_SIZE.toString()
      )}`
    );
    expect(screen.getByTestId('visualizationPlaceholder').textContent).toEqual(
      `Complete the expression to generate a preview.`
    );
    expect((screen.getByTestId('filterKuery') as HTMLInputElement).value).toEqual('');
  });

  test(`should use alert params when params are defined`, () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';

    setup(
      getAlertParams({
        aggType,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        termSize,
        termField,
        groupBy,
        threshold,
      })
    );

    expect(screen.getByTestId('whenExpression').textContent).toEqual(
      `when ${builtInAggregationTypes[aggType].text}`
    );
    expect(screen.getByTestId('groupByExpression').textContent).toEqual(
      `grouped over ${groupBy} ${termSize} '${termField}'`
    );

    expect(screen.getByTestId('thresholdPopover').textContent).toEqual(
      `${builtInComparators[thresholdComparator].text} ${threshold[0]} AND ${threshold[1]}`
    );
    expect(screen.getByTestId('forLastExpression').textContent).toEqual(
      `for the last ${timeWindowSize} ${getTimeUnitLabel(
        timeWindowUnit as TIME_UNITS,
        timeWindowSize.toString()
      )}`
    );
    expect(screen.getByTestId('visualizationPlaceholder').textContent).toEqual(
      `Complete the expression to generate a preview.`
    );
  });
});
