/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult } from '../';
import { LOGGER_ACTION_ID, LoggerAction } from './logger_action';

describe('LoggerAction', () => {

  const action = new LoggerAction({ server: { } });

  test('id and name to be from constructor', () => {
    expect(action.id).toBe(LOGGER_ACTION_ID);
    expect(action.name).toBe('Log');
  });

  test('getMissingFields to return []', () => {
    expect(action.getMissingFields()).toEqual([]);
  });

  test('doPerformHealthCheck returns ActionResult', async () => {
    const result = await action.doPerformHealthCheck();

    expect(result instanceof ActionResult).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(result.getMessage()).toMatch('Logger action is always usable.');
    expect(result.getResponse()).toEqual({ });
  });

  test('doPerformAction logs and returns ActionResult', async () => {
    const notification = { fake: true };

    const logger = jest.fn();
    const server = { log: logger };
    const action = new LoggerAction({ server });

    const result = await action.doPerformAction(notification);

    expect(result instanceof ActionResult).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(result.getMessage()).toMatch('Logged data returned as response.');
    expect(result.getResponse()).toBe(notification);

    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith([LOGGER_ACTION_ID, 'info'], notification);
  });

});
