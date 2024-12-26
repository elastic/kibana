/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { RuleCommonExpressions } from './rule_common_expressions';
import {
  builtInAggregationTypes,
  builtInComparators,
  getTimeUnitLabel,
  TIME_UNITS,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DEFAULT_VALUES } from '../constants';
import { CommonEsQueryRuleParams } from '../types';

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

  async function setup({
    ruleParams,
    hasValidationErrors = false,
    excludeHitsFromPreviousRun = true,
  }: {
    ruleParams: CommonEsQueryRuleParams;
    hasValidationErrors?: boolean;
    excludeHitsFromPreviousRun?: boolean;
  }) {
    const wrapper = mountWithIntl(
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
        onChangeSourceFields={() => {}}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  test(`should render RuleCommonExpressions with expected components when aggType doesn't require field`, async () => {
    const wrapper = await setup({ ruleParams: getCommonParams() });
    expect(wrapper.find('[data-test-subj="thresholdHelpPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="whenExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="groupByExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sizeValueExpression"]').exists()).toBeTruthy();
    const excludeHitsButton = wrapper.find(
      '[data-test-subj="excludeHitsFromPreviousRunExpression"]'
    );
    expect(excludeHitsButton.exists()).toBeTruthy();
    expect(excludeHitsButton.first().prop('checked')).toBeTruthy();
    expect(excludeHitsButton.first().prop('disabled')).toBe(false);

    const testQueryButton = wrapper.find('EuiButton[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(false);
  });

  test(`should render RuleCommonExpressions with expected components when aggType does require field`, async () => {
    const wrapper = await setup({ ruleParams: getCommonParams({ aggType: 'avg' }) });
    expect(wrapper.find('[data-test-subj="thresholdHelpPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="whenExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupByExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sizeValueExpression"]').exists()).toBeTruthy();
    const excludeHitsButton = wrapper.find(
      '[data-test-subj="excludeHitsFromPreviousRunExpression"]'
    );
    expect(excludeHitsButton.exists()).toBeTruthy();
    expect(excludeHitsButton.first().prop('checked')).toBeTruthy();

    const testQueryButton = wrapper.find('EuiButton[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(false);
  });

  test(`should set default rule common params when params are undefined`, async () => {
    const wrapper = await setup({
      ruleParams: getCommonParams({
        aggType: undefined,
        thresholdComparator: undefined,
        timeWindowSize: undefined,
        timeWindowUnit: undefined,
        groupBy: undefined,
        threshold: undefined,
      }),
    });

    expect(wrapper.find('button[data-test-subj="whenExpression"]').text()).toEqual(
      `when ${builtInAggregationTypes[DEFAULT_VALUES.AGGREGATION_TYPE].text}`
    );
    expect(wrapper.find('button[data-test-subj="groupByExpression"]').text()).toEqual(
      `over ${DEFAULT_VALUES.GROUP_BY} documents `
    );
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeFalsy();
    expect(wrapper.find('button[data-test-subj="thresholdPopover"]').text()).toEqual(
      `${builtInComparators[DEFAULT_VALUES.THRESHOLD_COMPARATOR].text} ${
        DEFAULT_VALUES.THRESHOLD[0]
      }`
    );
    expect(wrapper.find('button[data-test-subj="forLastExpression"]').text()).toEqual(
      `for the last ${DEFAULT_VALUES.TIME_WINDOW_SIZE} ${getTimeUnitLabel(
        DEFAULT_VALUES.TIME_WINDOW_UNIT as TIME_UNITS,
        DEFAULT_VALUES.TIME_WINDOW_SIZE.toString()
      )}`
    );
  });

  test(`should use rule params when common params are defined`, async () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';

    const wrapper = await setup({
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

    expect(wrapper.find('button[data-test-subj="whenExpression"]').text()).toEqual(
      `when ${builtInAggregationTypes[aggType].text}`
    );
    expect(wrapper.find('button[data-test-subj="groupByExpression"]').text()).toEqual(
      `grouped over ${groupBy} ${termSize} '${termField}'`
    );

    expect(wrapper.find('button[data-test-subj="thresholdPopover"]').text()).toEqual(
      `${builtInComparators[thresholdComparator].text} ${threshold[0]} AND ${threshold[1]}`
    );
    expect(wrapper.find('button[data-test-subj="forLastExpression"]').text()).toEqual(
      `for the last ${timeWindowSize} ${getTimeUnitLabel(
        timeWindowUnit as TIME_UNITS,
        timeWindowSize.toString()
      )}`
    );
  });

  test(`should use multiple group by terms`, async () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = ['term', 'term2'];

    const wrapper = await setup({
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
    expect(wrapper.find('button[data-test-subj="groupByExpression"]').text()).toEqual(
      `grouped over ${groupBy} ${termSize} 'term,term2'`
    );
  });

  test(`should disable excludeHitsFromPreviousRuns when groupBy is not all`, async () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';

    const wrapper = await setup({
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

    expect(
      wrapper
        .find('[data-test-subj="excludeHitsFromPreviousRunExpression"]')
        .first()
        .prop('disabled')
    ).toBe(true);
  });

  test(`should render excludeHitsFromPreviousRuns as unchecked when excludeHitsFromPreviousRun is false`, async () => {
    const wrapper = await setup({
      ruleParams: getCommonParams(),
      excludeHitsFromPreviousRun: false,
    });
    const excludeHitsButton = wrapper.find(
      '[data-test-subj="excludeHitsFromPreviousRunExpression"]'
    );
    expect(excludeHitsButton.exists()).toBeTruthy();
    expect(excludeHitsButton.first().prop('checked')).toBeFalsy();

    wrapper
      .find('input[data-test-subj="excludeHitsFromPreviousRunExpression"]')
      .simulate('change', { target: { checked: true } });
    expect(onChangeExcludeHitsFromPreviousRunFn).toHaveBeenCalledWith(true);
  });

  test(`should render test query button disabled if hasValidationErrors is true`, async () => {
    const wrapper = await setup({ ruleParams: getCommonParams(), hasValidationErrors: true });
    const testQueryButton = wrapper.find('EuiButton[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(true);
  });
});
