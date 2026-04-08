/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPollingInterval } from './get_polling_interval';

describe('getPollingInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return 5s when startDate is undefined', () => {
    expect(getPollingInterval(undefined)).toBe(5000);
  });

  it('should return 5s within the first 2 minutes', () => {
    const now = new Date();
    jest.setSystemTime(now);
    const startDate = new Date(now.getTime() - 60_000).toISOString(); // 1 min ago
    expect(getPollingInterval(startDate)).toBe(5000);
  });

  it('should return 15s between 2 and 10 minutes', () => {
    const now = new Date();
    jest.setSystemTime(now);
    const startDate = new Date(now.getTime() - 5 * 60_000).toISOString(); // 5 min ago
    expect(getPollingInterval(startDate)).toBe(15000);
  });

  it('should return 60s between 10 and 60 minutes', () => {
    const now = new Date();
    jest.setSystemTime(now);
    const startDate = new Date(now.getTime() - 30 * 60_000).toISOString(); // 30 min ago
    expect(getPollingInterval(startDate)).toBe(60000);
  });

  it('should return 5 minutes after 1 hour', () => {
    const now = new Date();
    jest.setSystemTime(now);
    const startDate = new Date(now.getTime() - 90 * 60_000).toISOString(); // 90 min ago
    expect(getPollingInterval(startDate)).toBe(300000);
  });
});
