/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateTimesAreEqual } from './date_time_equality';
import { HostOrNetworkProps } from '../types';

describe('date_time_equality', () => {
  test('it returns true if start and end date are equal', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(true);
  });

  test('it returns false if starts are not equal', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('1999').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if starts are not equal for next', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('1999').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2001').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if ends are not equal for next', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2001').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(false);
  });

  test('it returns false if skip is not equal', () => {
    const prev: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: true,
    };
    const next: HostOrNetworkProps = {
      startDate: new Date('2000').valueOf(),
      endDate: new Date('2000').valueOf(),
      narrowDateRange: jest.fn(),
      skip: false,
    };
    const equal = dateTimesAreEqual(prev, next);
    expect(equal).toEqual(false);
  });
});
