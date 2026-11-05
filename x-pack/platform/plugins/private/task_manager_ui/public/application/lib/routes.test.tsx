/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  getTasksPath,
  onPlainLeftClick,
  parseRoute,
  parseRunsTimeRangeSearch,
  pushPath,
  toRunsTimeRangeSearch,
} from './routes';
import { DEFAULT_RUNS_TIME_RANGE } from './runs_time_range';

describe('routes', () => {
  it('reads the overview and task list tabs from the path', () => {
    expect(parseRoute('overview')).toEqual({ tab: 'overview' });
    expect(parseRoute('tasks')).toEqual({ tab: 'tasks' });
    expect(getTasksPath()).toBe('/tasks');
  });

  it('keeps the colons of task types readable in their path', () => {
    expect(getTasksPath('alerting:.es-query')).toBe('/alerting:.es-query');
    expect(parseRoute('alerting:.es-query')).toEqual({
      tab: 'tasks',
      taskType: 'alerting:.es-query',
    });
  });

  it.each(['alerting:.es-query', 'a/b c%d'])(
    'opens the task list of %s through the browser history',
    (taskType) => {
      const history = createMemoryHistory();

      pushPath(history, getTasksPath(taskType), '');

      expect(parseRoute(history.location.pathname.slice(1))).toEqual({ tab: 'tasks', taskType });
      expect(history.createHref(history.location)).toBe(getTasksPath(taskType));
    }
  );

  it('keeps the run history time range in the URL', () => {
    const history = createMemoryHistory();
    const timeRange = { start: '2026-11-04T10:00:00.000Z', end: 'now' };

    pushPath(history, getTasksPath('alerting:.es-query'), toRunsTimeRangeSearch(timeRange));

    expect(parseRunsTimeRangeSearch(history.location.search)).toEqual(timeRange);
  });

  it.each([
    ['no time range', ''],
    ['only a start', '?start=now-7d'],
    ['an unparseable time range', '?start=now-3x&end=now'],
    ['a time range longer than 30 days', '?start=now-31d&end=now'],
  ])('reads the default time range from a URL with %s', (_, search) => {
    expect(parseRunsTimeRangeSearch(search)).toEqual(DEFAULT_RUNS_TIME_RANGE);
  });

  it('handles plain left clicks and leaves other clicks to the browser', () => {
    const onClick = jest.fn();
    render(
      <a href="/tasks" onClick={onPlainLeftClick(onClick)}>
        Tasks
      </a>
    );
    const link = screen.getByText('Tasks');

    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(link, { button: 1 })).toBe(true);
    expect(onClick).not.toHaveBeenCalled();

    expect(fireEvent.click(link)).toBe(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
