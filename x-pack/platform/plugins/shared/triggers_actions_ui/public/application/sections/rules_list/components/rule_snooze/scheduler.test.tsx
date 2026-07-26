/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RuleSnoozeScheduler, hiddenCalendarClassName } from './scheduler';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ReactMock = jest.requireActual('react');

  return {
    ...actual,
    EuiDatePicker: ({ calendarClassName }: { calendarClassName?: string }) =>
      ReactMock.createElement('div', {
        'data-test-subj': 'mockEuiDatePicker',
        'data-calendar-class-name': calendarClassName,
      }),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: jest.fn(() => 'UTC'),
}));

describe('RuleSnoozeScheduler', () => {
  test('uses an owned class instead of the legacy Bootstrap hidden class', () => {
    expect(hiddenCalendarClassName).not.toBe('hidden');

    const { container } = renderWithI18n(
      <RuleSnoozeScheduler
        onClose={jest.fn()}
        onSaveSchedule={jest.fn()}
        onCancelSchedules={jest.fn()}
        initialSchedule={null}
        isLoading={false}
        hasTitle={false}
      />
    );

    const datePickerCalendarClassNames = Array.from(
      container.querySelectorAll('[data-test-subj="mockEuiDatePicker"]')
    ).map((datePicker) => datePicker.getAttribute('data-calendar-class-name'));

    expect(datePickerCalendarClassNames).toEqual([
      hiddenCalendarClassName,
      hiddenCalendarClassName,
      null,
    ]);
    expect(container.querySelector('.hidden')).toBeNull();
  });
});
