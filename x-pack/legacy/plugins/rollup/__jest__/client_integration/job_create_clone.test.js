/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual(
    '../../../../../../src/legacy/ui/public/index_patterns/constants'
  ); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: { set: () => {} },
  getInjected: () => ({}),
}));

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobClone;
const {
  jobs: [{ config: jobConfig }],
} = JOB_TO_CLONE;

describe('Cloning a job with the create job wizard', () => {
  let httpRequestsMockHelpers;
  let server;
  let find;
  let exists;
  let form;
  let table;
  let actions;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  beforeEach(() => {
    httpRequestsMockHelpers.setIndexPatternValidityResponse(JOB_CLONE_INDEX_PATTERN_CHECK);

    ({ exists, find, form, actions, table } = setup());
  });

  afterAll(() => {
    server.restore();
  });

  it('should have fields correctly pre-populated', async () => {
    expect(find('rollupJobName').props().value).toBe(jobConfig.id);
    expect(form.getErrorsMessages()).toEqual([
      `Name cannot be the same as cloned name: "t2".`,
      `Rollup index name cannot be the same as cloned rollup index name: "t2".`,
    ]);
    // Advanced cron should automatically show when we are cloning a job
    expect(exists('rollupAdvancedCron')).toBe(true);

    expect(find('rollupAdvancedCron').props().value).toBe(jobConfig.cron);
    expect(find('rollupPageSize').props().value).toBe(jobConfig.page_size);
    const {
      groups: { date_histogram: dateHistogram },
    } = jobConfig;
    expect(find('rollupDelay').props().value).toBe(dateHistogram.delay);

    form.setInputValue('rollupJobName', 't3');
    form.setInputValue('rollupIndexName', 't3');

    await actions.clickNextStep();

    expect(find('rollupJobCreateDateFieldSelect').props().value).toBe(dateHistogram.field);
    expect(find('rollupJobInterval').props().value).toBe(dateHistogram.calendar_interval);
    expect(find('rollupJobCreateTimeZoneSelect').props().value).toBe(dateHistogram.time_zone);

    await actions.clickNextStep();

    const { tableCellsValues: tableCellValuesTerms } = table.getMetaData('rollupJobTermsFieldList');
    const {
      groups: {
        terms: { fields: terms },
      },
    } = jobConfig;

    expect(tableCellValuesTerms.length).toBe(terms.length);
    for (const [keyword] of tableCellValuesTerms) {
      expect(terms.find(term => term === keyword)).toBe(keyword);
    }

    await actions.clickNextStep();

    const { tableCellsValues: tableCellValuesHisto } = table.getMetaData(
      'rollupJobHistogramFieldList'
    );

    const {
      groups: {
        histogram: { fields: histogramsTerms },
      },
    } = jobConfig;

    expect(tableCellValuesHisto.length).toBe(histogramsTerms.length);
    for (const [keyword] of tableCellValuesHisto) {
      expect(histogramsTerms.find(term => term === keyword)).toBe(keyword);
    }

    await actions.clickNextStep();

    const { metrics } = jobConfig;
    const { rows: metricsRows } = table.getMetaData('rollupJobMetricsFieldList');

    // Slight nastiness due to nested arrays:
    // For each row in the metrics table we want to assert that the checkboxes
    // are either checked, or not checked, according to the job config we are cloning
    metricsRows.forEach((metricRow, idx) => {
      // Assumption: metrics from the jobConfig and metrics displayed on the UI
      // are parallel arrays; so we can use row index to get the corresponding config.
      const { metrics: checkedMetrics } = metrics[idx];
      const {
        columns: [, , { reactWrapper: checkboxColumn }],
      } = metricRow;

      let checkedCountActual = 0;
      const checkedCountExpected = checkedMetrics.length;

      checkboxColumn.find('input').forEach(el => {
        const props = el.props();
        const shouldBeChecked = checkedMetrics.some(
          checkedMetric => props['data-test-subj'] === `rollupJobMetricsCheckbox-${checkedMetric}`
        );
        if (shouldBeChecked) ++checkedCountActual;
        expect(props.checked).toBe(shouldBeChecked);
      });

      // All inputs from job config have been accounted for on the UI
      expect(checkedCountActual).toBe(checkedCountExpected);
    });
  });
});
