/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RuleCommonExpressions } from './rule_common_expressions';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import {
  builtInAggregationTypes,
  builtInComparators,
  getTimeUnitLabel,
} from '@kbn/triggers-actions-ui-plugin/public';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { DEFAULT_VALUES } from '../constants';
import type { CommonEsQueryRuleParams } from '../types';

const errors = {
  index: new Array<string>(),
  size: new Array<string>(),
  timeField: new Array<string>(),
  threshold0: new Array<string>(),
  threshold1: new Array<string>(),
  esQuery: new Array<string>(),
  thresholdComparator: new Array<string>(),
  timeWindowSize: new Array<string>(),
  searchConfiguration: new Array<string>(),
  searchType: new Array<string>(),
  aggField: new Array<string>(),
  aggType: new Array<string>(),
  groupBy: new Array<string>(),
  termSize: new Array<string>(),
  termField: new Array<string>(),
};

describe('RuleCommonExpressions', () => {
  const onChangeExcludeHitsFromPreviousRunFn = jest.fn();
  function getCommonParams(overrides = {}) {
    return {
      thresholdComparator: '>',
      threshold: [0],
      timeWindowSize: 15,
      timeWindowUnit: 's',
      aggType: 'count',
      size: 100,
      ...overrides,
    } as unknown as CommonEsQueryRuleParams;
  }

  function setup({
    ruleParams,
    hasValidationErrors = false,
    excludeHitsFromPreviousRun = true,
  }: {
    ruleParams: CommonEsQueryRuleParams;
    hasValidationErrors?: boolean;
    excludeHitsFromPreviousRun?: boolean;
  }) {
    return renderWithI18n(
      <RuleCommonExpressions
        esFields={[]}
        thresholdComparator={ruleParams.thresholdComparator}
        threshold={ruleParams.threshold}
        timeWindowSize={ruleParams.timeWindowSize}
        timeWindowUnit={ruleParams.timeWindowUnit}
        size={ruleParams.size}
        aggType={ruleParams.aggType}
        aggField={ruleParams.aggField}
        groupBy={ruleParams.groupBy}
        termSize={ruleParams.termSize}
        termField={ruleParams.termField}
        onChangeSelectedAggField={() => {}}
        onChangeSelectedAggType={() => {}}
        onChangeSelectedGroupBy={() => {}}
        onChangeSelectedTermField={() => {}}
        onChangeSelectedTermSize={() => {}}
        onChangeThreshold={() => {}}
        onChangeThresholdComparator={() => {}}
        onChangeWindowSize={() => {}}
        onChangeWindowUnit={() => {}}
        onChangeSizeValue={() => {}}
        errors={errors}
        hasValidationErrors={hasValidationErrors}
        onTestFetch={async () => {
          return {
            testResults: { results: [], truncated: false },
            isGrouped: false,
            timeWindow: '1m',
          };
        }}
        excludeHitsFromPreviousRun={excludeHitsFromPreviousRun}
        onChangeExcludeHitsFromPreviousRun={onChangeExcludeHitsFromPreviousRunFn}
      />
    );
  }

  test(`should render RuleCommonExpressions with expected components when aggType doesn't require field`, async () => {
    setup({ ruleParams: getCommonParams() });
    expect(screen.getByTestId('thresholdHelpPopover')).toBeInTheDocument();

    // Expression items are lazy-loaded; wait for them to render
    await screen.findByTestId('whenExpression');
    expect(screen.queryByTestId('ofExpressionPopover')).not.toBeInTheDocument();
    expect(screen.getByTestId('groupByExpression')).toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(screen.getByTestId('forLastExpression')).toBeInTheDocument();
    expect(screen.getByTestId('sizeValueExpression')).toBeInTheDocument();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeInTheDocument();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeChecked();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).not.toBeDisabled();

    expect(screen.getByTestId('testQuery')).toBeInTheDocument();
    expect(screen.getByTestId('testQuery')).not.toBeDisabled();
  });

  test(`should render RuleCommonExpressions with expected components when aggType does require field`, async () => {
    setup({ ruleParams: getCommonParams({ aggType: 'avg' }) });
    expect(screen.getByTestId('thresholdHelpPopover')).toBeInTheDocument();

    // Expression items are lazy-loaded; wait for them to render
    await screen.findByTestId('whenExpression');
    await screen.findByTestId('ofExpressionPopover');
    expect(screen.getByTestId('groupByExpression')).toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover')).toBeInTheDocument();
    expect(screen.getByTestId('forLastExpression')).toBeInTheDocument();
    expect(screen.getByTestId('sizeValueExpression')).toBeInTheDocument();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeInTheDocument();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeChecked();

    expect(screen.getByTestId('testQuery')).toBeInTheDocument();
    expect(screen.getByTestId('testQuery')).not.toBeDisabled();
  });

  test(`should set default rule common params when params are undefined`, () => {
    setup({
      ruleParams: getCommonParams({
        aggType: undefined,
        thresholdComparator: undefined,
        timeWindowSize: undefined,
        timeWindowUnit: undefined,
        groupBy: undefined,
        threshold: undefined,
      }),
    });

    expect(screen.getByTestId('whenExpression')).toHaveTextContent(
      `when ${builtInAggregationTypes[DEFAULT_VALUES.AGGREGATION_TYPE].text}`
    );
    expect(screen.getByTestId('groupByExpression')).toHaveTextContent(
      `over ${DEFAULT_VALUES.GROUP_BY} documents`
    );
    expect(screen.queryByTestId('ofExpressionPopover')).not.toBeInTheDocument();
    expect(screen.getByTestId('thresholdPopover')).toHaveTextContent(
      `${builtInComparators[DEFAULT_VALUES.THRESHOLD_COMPARATOR].text} ${
        DEFAULT_VALUES.THRESHOLD[0]
      }`
    );
    expect(screen.getByTestId('forLastExpression')).toHaveTextContent(
      `for the last ${DEFAULT_VALUES.TIME_WINDOW_SIZE} ${getTimeUnitLabel(
        DEFAULT_VALUES.TIME_WINDOW_UNIT as TIME_UNITS,
        DEFAULT_VALUES.TIME_WINDOW_SIZE.toString()
      )}`
    );
  });

  test(`should use rule params when common params are defined`, () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';

    setup({
      ruleParams: getCommonParams({
        aggType,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        termSize,
        termField,
        groupBy,
        threshold,
      }),
    });

    expect(screen.getByTestId('whenExpression')).toHaveTextContent(
      `when ${builtInAggregationTypes[aggType].text}`
    );
    expect(screen.getByTestId('groupByExpression')).toHaveTextContent(
      `grouped over ${groupBy} ${termSize} '${termField}'`
    );

    expect(screen.getByTestId('thresholdPopover')).toHaveTextContent(
      `${builtInComparators[thresholdComparator].text} ${threshold[0]} AND ${threshold[1]}`
    );
    expect(screen.getByTestId('forLastExpression')).toHaveTextContent(
      `for the last ${timeWindowSize} ${getTimeUnitLabel(
        timeWindowUnit as TIME_UNITS,
        timeWindowSize.toString()
      )}`
    );
  });

  test(`should use multiple group by terms`, () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = ['term', 'term2'];

    setup({
      ruleParams: getCommonParams({
        aggType,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        termSize,
        termField,
        groupBy,
        threshold,
      }),
    });
    expect(screen.getByTestId('groupByExpression')).toHaveTextContent(
      `grouped over ${groupBy} ${termSize} 'term,term2'`
    );
  });

  test(`should disable excludeHitsFromPreviousRuns when groupBy is not all`, () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';

    setup({
      ruleParams: getCommonParams({
        aggType,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        termSize,
        termField,
        groupBy,
        threshold,
      }),
    });

    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeDisabled();
  });

  test(`should render excludeHitsFromPreviousRuns as unchecked when excludeHitsFromPreviousRun is false`, async () => {
    setup({
      ruleParams: getCommonParams(),
      excludeHitsFromPreviousRun: false,
    });
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).toBeInTheDocument();
    expect(screen.getByTestId('excludeHitsFromPreviousRunExpression')).not.toBeChecked();

    await userEvent.click(screen.getByTestId('excludeHitsFromPreviousRunExpression'));
    expect(onChangeExcludeHitsFromPreviousRunFn).toHaveBeenCalledWith(true);
  });

  test(`should render test query button disabled if hasValidationErrors is true`, () => {
    setup({ ruleParams: getCommonParams(), hasValidationErrors: true });
    expect(screen.getByTestId('testQuery')).toBeInTheDocument();
    expect(screen.getByTestId('testQuery')).toBeDisabled();
  });

  test('should not include inclusive range comparators in threshold options', async () => {
    setup({ ruleParams: getCommonParams() });

    await userEvent.click(screen.getByTestId('thresholdPopover'));

    const comboBox = await screen.findByTestId('comparatorOptionsComboBox');
    const comparatorOptionValues = Array.from(comboBox.querySelectorAll('option')).map((option) =>
      option.getAttribute('value')
    );

    expect(comparatorOptionValues).not.toContain(COMPARATORS.BETWEEN_INCLUSIVE);
    expect(comparatorOptionValues).not.toContain(COMPARATORS.NOT_BETWEEN_INCLUSIVE);
  });
});
