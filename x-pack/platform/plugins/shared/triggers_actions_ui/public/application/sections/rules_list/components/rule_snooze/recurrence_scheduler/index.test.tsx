/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import moment from 'moment';
import React from 'react';
import { RRuleFrequency } from '../../../../../../types';
import { RecurrenceScheduler } from '.';

describe('RecurrenceScheduler', () => {
  test('hydrates a monthly bymonthday schedule as custom on day N', async () => {
    const startDate = moment('11/23/2021');
    const endDate = moment('11/23/2021').add(2, 'hours');
    const onChange = jest.fn();

    renderWithI18n(
      <RecurrenceScheduler
        startDate={startDate}
        endDate={endDate}
        initialState={{
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          bymonthday: [23],
        }}
        onChange={onChange}
      />
    );
    expect(await screen.findByTestId('recurrenceSchedulerRepeat')).toHaveValue('CUSTOM');

    expect(await screen.findByTestId('customRecurrenceSchedulerMonthly')).toBeInTheDocument();

    expect(await screen.findByText('Repeats every month on day 23')).toBeInTheDocument();

    await waitFor(() => {
      const lastCall = onChange.mock.calls.at(-1)?.[0];
      expect(lastCall).toEqual(
        expect.objectContaining({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          bymonthday: [23],
        })
      );
      expect(lastCall.byweekday).toBeUndefined();
    });
  });
});
