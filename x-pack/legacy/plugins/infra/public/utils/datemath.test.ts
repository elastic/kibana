/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidDatemath, datemathToEpochMillis } from './datemath';
import sinon from 'sinon';

describe('isValidDatemath()', () => {
  it('Returns `false` for empty strings', () => {
    expect(isValidDatemath('')).toBe(false);
  });

  it('Returns `false` for invalid strings', () => {
    expect(isValidDatemath('wadus')).toBe(false);
    expect(isValidDatemath('nowww-')).toBe(false);
    expect(isValidDatemath('now-')).toBe(false);
    expect(isValidDatemath('now-1')).toBe(false);
    expect(isValidDatemath('now-1d/')).toBe(false);
  });

  it('Returns `true` for valid strings', () => {
    expect(isValidDatemath('now')).toBe(true);
    expect(isValidDatemath('now-1d')).toBe(true);
    expect(isValidDatemath('now-1d/d')).toBe(true);
  });
});

describe('datemathToEpochMillis()', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now());
  });

  afterEach(() => {
    clock.restore();
  });

  it('Returns `0` for the dawn of time', () => {
    expect(datemathToEpochMillis('1970-01-01T00:00:00+00:00')).toEqual(0);
  });

  it('Returns the current timestamp when `now`', () => {
    expect(datemathToEpochMillis('now')).toEqual(Date.now());
  });
});
