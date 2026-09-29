/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RuleSnoozeScheduler, hiddenCalendarClassName } from './scheduler';

vi.mock('@elastic/eui', async () => {
  const actual = (await vi.importActual('@elastic/eui'));
  const ReactMock = require('react');

  return {
    ...actual,
    EuiDatePicker: ({ calendarClassName }: { calendarClassName?: string }) =>
      ReactMock.createElement('div', {
        'data-test-subj': 'mockEuiDatePicker',
        'data-calendar-class-name': calendarClassName,
      }),
  };
});

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useUiSetting: vi.fn(() => 'UTC'),
    };
      return { ...mocked, default: mocked };
    });

describe('RuleSnoozeScheduler', () => {
  test('uses an owned class instead of the legacy Bootstrap hidden class', () => {
    expect(hiddenCalendarClassName).not.toBe('hidden');

    const { container } = renderWithI18n(
      <RuleSnoozeScheduler
        onClose={vi.fn()}
        onSaveSchedule={vi.fn()}
        onCancelSchedules={vi.fn()}
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
