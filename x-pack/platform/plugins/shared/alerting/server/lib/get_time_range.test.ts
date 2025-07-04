/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getTimeRange } from './get_time_range';

describe('getTimeRange', () => {
  const logger = loggingSystemMock.create().get();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-10-04T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test(`returns time range with no options`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
    });
    expect(dateStart).toBe('2023-10-04T00:00:00.000Z');
    expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
  });

  test(`returns time range with window`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      window: '5m',
    });
    expect(dateStart).toBe('2023-10-03T23:55:00.000Z');
    expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
  });

  test(`returns time range with queryDelay`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      queryDelay: 30,
    });
    expect(dateStart).toBe('2023-10-03T23:59:30.000Z');
    expect(dateEnd).toBe('2023-10-03T23:59:30.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 30 seconds');
  });

  test(`returns time range with forceNow`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      forceNow: new Date('2022-10-04T00:00:00.000Z'),
    });
    expect(dateStart).toBe('2022-10-04T00:00:00.000Z');
    expect(dateEnd).toBe('2022-10-04T00:00:00.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
  });

  test(`returns time range with window and queryDelay`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      window: '5m',
      queryDelay: 30,
    });
    expect(dateStart).toBe('2023-10-03T23:54:30.000Z');
    expect(dateEnd).toBe('2023-10-03T23:59:30.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 30 seconds');
  });

  test(`returns time range with window and forceNow`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      window: '5m',
      forceNow: new Date('2022-10-04T00:00:00.000Z'),
    });
    expect(dateStart).toBe('2022-10-03T23:55:00.000Z');
    expect(dateEnd).toBe('2022-10-04T00:00:00.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
  });

  test(`returns time range with queryDelay and forceNow`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      forceNow: new Date('2022-10-04T00:00:00.000Z'),
      queryDelay: 30,
    });
    expect(dateStart).toBe('2022-10-03T23:59:30.000Z');
    expect(dateEnd).toBe('2022-10-03T23:59:30.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 30 seconds');
  });

  test(`returns time range with all options specified`, () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      window: '5m',
      queryDelay: 45,
      forceNow: new Date('2022-10-04T00:00:00.000Z'),
    });
    expect(dateStart).toBe('2022-10-03T23:54:15.000Z');
    expect(dateEnd).toBe('2022-10-03T23:59:15.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 45 seconds');
  });

  test('throws an error when window is invalid', () => {
    expect(() => getTimeRange({ logger, window: '5k' })).toThrowErrorMatchingInlineSnapshot(
      `"Invalid format for windowSize: \\"5k\\""`
    );
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
