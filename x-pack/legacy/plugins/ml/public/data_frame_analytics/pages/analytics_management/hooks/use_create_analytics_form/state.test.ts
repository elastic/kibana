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
  });
});
