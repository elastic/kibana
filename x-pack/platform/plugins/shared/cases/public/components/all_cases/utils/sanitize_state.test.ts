/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { CaseSeverity } from '../../../../common';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import { sanitizeState } from './sanitize_state';

describe('sanitizeState', () => {
  it('sanitize default state correctly', () => {
    expect(sanitizeState(DEFAULT_CASES_TABLE_STATE)).toEqual(DEFAULT_CASES_TABLE_STATE);
  });

  it('sanitize perPage query param correctly if it is bigger than 100', () => {
    expect(sanitizeState({ queryParams: { perPage: 1000 } })).toEqual({
      filterOptions: {},
      queryParams: { perPage: 100 },
    });
  });

  it('sanitize sortOrder correctly', () => {
    // @ts-expect-error: need to check unrecognized values
    expect(sanitizeState({ queryParams: { sortOrder: 'foo' } })).toEqual({
      filterOptions: {},
      queryParams: { sortOrder: 'desc' },
    });
  });

  it('returns empty state with no arguments', () => {
    expect(sanitizeState()).toEqual({
      filterOptions: {},
      queryParams: {},
    });
  });

  it('sanitize status correctly', () => {
    // @ts-expect-error: need to check unrecognized values
    expect(sanitizeState({ filterOptions: { status: ['foo', CaseStatuses.open] } })).toEqual({
      filterOptions: { status: ['open'] },
      queryParams: {},
    });
  });

  it('sanitize severity correctly', () => {
    // @ts-expect-error: need to check unrecognized values
    expect(sanitizeState({ filterOptions: { severity: ['foo', CaseSeverity.MEDIUM] } })).toEqual({
      filterOptions: { severity: ['medium'] },
      queryParams: {},
    });
  });
});
