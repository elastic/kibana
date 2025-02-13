/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook } from '@testing-library/react';
import React from 'react';
import {
  RulesListColumns,
  RulesListVisibleColumns,
  useRulesListColumnSelector,
} from './rules_list_column_selector';

const allRuleColumns: RulesListColumns[] = [
  {
    id: 'ruleName',
    field: 'name',
    name: 'Name',
  },
  {
    id: 'ruleTags',
    field: 'tags',
    selectorName: 'Tags',
    name: '',
  },
  {
    id: 'ruleExecutionStatusLastDate',
    field: 'executionStatus.lastExecutionDate',
    name: 'Last run',
  },
  {
    id: 'ruleSnoozeNotify',
    field: 'notify',
    selectorName: 'Notify',
    name: 'Html Notify',
  },
  {
    id: 'ruleScheduleInterval',
    field: 'schedule.interval',
    name: 'Interval',
  },
  {
    id: 'ruleExecutionStatusLastDuration',
    field: 'executionStatus.lastDuration',
    selectorName: 'Duration',
    name: 'Html Duration',
  },
];

const visibleColumns: RulesListVisibleColumns[] = [
  'ruleName',
  'ruleTags',
  'ruleExecutionStatusLastDate',
  'ruleSnoozeNotify',
  'ruleScheduleInterval',
  'ruleExecutionStatusLastDuration',
];

describe('useRulesListColumnSelector', () => {
  it('Every columns should be visible', () => {
    const { result } = renderHook(() =>
      useRulesListColumnSelector({
        allRuleColumns,
        visibleColumns,
      })
    );
    const [rulesColumns, ColumnSelector] = result.current;

    expect(rulesColumns).toEqual([
      { field: 'name', name: 'Name' },
      { field: 'tags', name: '' },
      { field: 'executionStatus.lastExecutionDate', name: 'Last run' },
      { field: 'notify', name: 'Html Notify' },
      { field: 'schedule.interval', name: 'Interval' },
      {
        field: 'executionStatus.lastDuration',
        name: 'Html Duration',
      },
    ]);

    const { getByText } = render(<>{ColumnSelector}</>);
    expect(getByText('Columns')).toBeInTheDocument();
  });

  it('Lets hide last duration column', () => {
    const { result } = renderHook(() =>
      useRulesListColumnSelector({
        allRuleColumns,
        visibleColumns: [
          'ruleName',
          'ruleTags',
          'ruleExecutionStatusLastDate',
          'ruleSnoozeNotify',
          'ruleScheduleInterval',
        ],
      })
    );
    const [rulesColumns, ColumnSelector] = result.current;

    expect(rulesColumns).toEqual([
      { field: 'name', name: 'Name' },
      { field: 'tags', name: '' },
      { field: 'executionStatus.lastExecutionDate', name: 'Last run' },
      { field: 'notify', name: 'Html Notify' },
      { field: 'schedule.interval', name: 'Interval' },
    ]);

    const { getByLabelText } = render(<>{ColumnSelector}</>);
    expect(getByLabelText('- Active: 5 out of 6')).toBeInTheDocument();
  });

  it('Lets hide last lastExecutionDate, Interval and duration columns', () => {
    const { result } = renderHook(() =>
      useRulesListColumnSelector({
        allRuleColumns,
        visibleColumns: ['ruleName', 'ruleTags', 'ruleSnoozeNotify'],
      })
    );
    const [rulesColumns, ColumnSelector] = result.current;

    expect(rulesColumns).toEqual([
      { field: 'name', name: 'Name' },
      { field: 'tags', name: '' },
      { field: 'notify', name: 'Html Notify' },
    ]);

    const { getByLabelText } = render(<>{ColumnSelector}</>);
    expect(getByLabelText('- Active: 3 out of 6')).toBeInTheDocument();
  });
});
