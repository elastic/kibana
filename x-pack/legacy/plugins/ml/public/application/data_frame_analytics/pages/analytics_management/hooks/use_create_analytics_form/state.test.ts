/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';

import { getInitialState, getJobConfigFromFormState } from './state';

describe('useCreateAnalyticsForm', () => {
  test('state: getJobConfigFromFormState()', () => {
    const state = getInitialState();

    state.form.destinationIndex = 'the-destination-index';
    state.form.sourceIndex = 'the-source-index';

    const jobConfig = getJobConfigFromFormState(state.form);

    expect(idx(jobConfig, _ => _.dest.index)).toBe('the-destination-index');
    expect(idx(jobConfig, _ => _.source.index)).toBe('the-source-index');
    expect(idx(jobConfig, _ => _.analyzed_fields.excludes)).toStrictEqual([]);
    expect(typeof idx(jobConfig, _ => _.analyzed_fields.includes)).toBe('undefined');

    // test the conversion of comma-separated Kibana index patterns to ES array based index patterns
    state.form.sourceIndex = 'the-source-index-1,the-source-index-2';
    const jobConfigSourceIndexArray = getJobConfigFromFormState(state.form);
    expect(idx(jobConfigSourceIndexArray, _ => _.source.index)).toStrictEqual([
      'the-source-index-1',
      'the-source-index-2',
    ]);
  });
});
