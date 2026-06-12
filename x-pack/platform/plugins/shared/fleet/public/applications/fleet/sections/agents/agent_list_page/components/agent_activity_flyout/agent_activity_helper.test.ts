/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionStatus } from '../../../../../types';

import { getOtherDaysActions, getTodayActions } from './agent_activity_helper';

describe('agent activity helper', () => {
  const actions = [
    { creationTime: '2022-09-14T14:44:23.501Z' },
    { creationTime: '2022-09-14T11:44:23.501Z' },
    { creationTime: '2022-09-12T14:44:23.501Z' },
    { creationTime: '2022-09-11T14:44:23.501Z' },
    { creationTime: '2022-09-11T10:44:23.501Z' },
  ] as ActionStatus[];

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2022-09-14'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should filter today actions', () => {
    const result = getTodayActions(actions);
    expect(result.length).toEqual(2);
  });

  it('should filter other day actions', () => {
    const result = getOtherDaysActions(actions);
    expect(Object.keys(result)).toEqual(['2022-09-12', '2022-09-11']);
    expect(result['2022-09-12'].length).toEqual(1);
    expect(result['2022-09-11'].length).toEqual(2);
  });
});
