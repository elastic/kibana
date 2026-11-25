/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ScheduledTriggerFields } from './scheduled_trigger_fields';

type WithValue = Record<string, unknown> | undefined;

let setExternal: (value: WithValue) => void = () => {};

/** Hands the form back what it wrote, as the panel does through the trigger's YAML. */
function Harness({
  initial,
  readOnly,
  onWrite,
}: {
  initial: WithValue;
  readOnly?: boolean;
  onWrite: (value: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState<WithValue>(initial);
  setExternal = setValue;
  return (
    <I18nProvider>
      <ScheduledTriggerFields
        value={value}
        readOnly={readOnly}
        onChange={(next) => {
          onWrite(next);
          setValue(next);
        }}
      />
    </I18nProvider>
  );
}

const setup = (initial: WithValue = { every: '5m' }, readOnly = false) => {
  const onWrite = jest.fn();
  render(<Harness initial={initial} readOnly={readOnly} onWrite={onWrite} />);
  return { onWrite };
};

const lastWrite = (onWrite: jest.Mock) => onWrite.mock.calls[onWrite.mock.calls.length - 1]?.[0];
const byId = (id: string) => screen.getByTestId(id);
const click = (id: string) => fireEvent.click(byId(id));

const weeklyOnMonday = {
  rrule: {
    freq: 'WEEKLY',
    interval: 1,
    tzid: 'UTC',
    byweekday: ['MO'],
    byhour: [7],
    byminute: [0],
  },
};

describe('ScheduledTriggerFields', () => {
  describe('Interval', () => {
    it('shows the interval, short examples, and where weekly and monthly are', () => {
      setup({ every: '90s' });

      expect(byId('workflowTriggerConfigPanelEvery')).toHaveValue('90s');
      expect(
        screen.getByText(
          'Minimum 1 minute. Examples: 90s, 15m, 2h, 1d. Here m is minutes: for weekly or monthly runs, use Date & time.'
        )
      ).toBeInTheDocument();
      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Runs every 90 seconds.'
      );
    });

    it('writes the interval as it is typed', () => {
      const { onWrite } = setup();

      fireEvent.change(byId('workflowTriggerConfigPanelEvery'), { target: { value: '15m' } });

      expect(lastWrite(onWrite)).toEqual({ every: '15m' });
    });

    it('explains an interval the spec would reject, and does not write it', () => {
      const { onWrite } = setup();

      fireEvent.change(byId('workflowTriggerConfigPanelEvery'), { target: { value: '30s' } });

      expect(screen.getByText(/at least 1 minute: for example 90s/i)).toBeInTheDocument();
      expect(onWrite).not.toHaveBeenCalled();
      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Complete the fields below to see the schedule.'
      );
    });
  });

  describe('the summary', () => {
    it('sits right below the Interval | Date & time switch, above every other field', () => {
      setup(weeklyOnMonday);

      const order = screen
        .getAllByTestId(/^workflowTriggerConfigSchedule(Mode|Summary|Repeat)$/)
        .map((element) => element.getAttribute('data-test-subj'));

      expect(order).toEqual([
        'workflowTriggerConfigScheduleMode',
        'workflowTriggerConfigScheduleSummary',
        'workflowTriggerConfigScheduleRepeat',
      ]);
    });

    it('says what is missing instead of going blank while a field is invalid', () => {
      setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleDay-MO');

      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Complete the fields below to see the schedule.'
      );
    });
  });

  describe('Date & time', () => {
    it('switches to a weekly schedule on the prototype defaults', () => {
      const { onWrite } = setup();

      click('workflowTriggerConfigScheduleMode-calendar');

      expect(lastWrite(onWrite)).toEqual({
        rrule: {
          freq: 'WEEKLY',
          interval: 1,
          tzid: 'UTC',
          byweekday: ['WE'],
          byhour: [8],
          byminute: [0],
        },
      });
      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Every week on Wednesday at 08:00 UTC.'
      );
    });

    it('shows an existing schedule', () => {
      setup(weeklyOnMonday);

      expect(byId('workflowTriggerConfigScheduleCount')).toHaveValue(1);
      expect(byId('workflowTriggerConfigScheduleTime')).toHaveValue('07:00');
      expect(byId('workflowTriggerConfigScheduleTimezone')).toHaveValue('UTC');
      expect(byId('workflowTriggerConfigScheduleDay-MO')).toHaveAttribute('aria-pressed', 'true');
      expect(byId('workflowTriggerConfigScheduleDay-TU')).not.toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('writes the days as they are picked', () => {
      const { onWrite } = setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleDay-FR');

      expect(lastWrite(onWrite).rrule.byweekday).toEqual(['MO', 'FR']);
    });

    it('writes the time, the time zone and the number of weeks', () => {
      const { onWrite } = setup(weeklyOnMonday);

      fireEvent.change(byId('workflowTriggerConfigScheduleTime'), { target: { value: '09:30' } });
      fireEvent.change(byId('workflowTriggerConfigScheduleTimezone'), {
        target: { value: 'Europe/Madrid' },
      });
      fireEvent.change(byId('workflowTriggerConfigScheduleCount'), { target: { value: '2' } });

      expect(lastWrite(onWrite).rrule).toMatchObject({
        interval: 2,
        tzid: 'Europe/Madrid',
        byhour: [9],
        byminute: [30],
      });
    });

    it('asks for a day, and writes nothing, when none is left', () => {
      const { onWrite } = setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleDay-MO');

      expect(screen.getByText('Select at least one day.')).toBeInTheDocument();
      expect(onWrite).not.toHaveBeenCalled();
    });

    it('asks for a whole number of repeats', () => {
      const { onWrite } = setup(weeklyOnMonday);

      fireEvent.change(byId('workflowTriggerConfigScheduleCount'), { target: { value: '0' } });

      expect(screen.getByText('Enter a whole number of 1 or more.')).toBeInTheDocument();
      expect(onWrite).not.toHaveBeenCalled();
    });

    it('starts a daily schedule on every day, which is written with no days', () => {
      const { onWrite } = setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleRepeat-daily');

      expect(lastWrite(onWrite).rrule.freq).toBe('DAILY');
      expect(lastWrite(onWrite).rrule).not.toHaveProperty('byweekday');
      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Every day at 07:00 UTC.'
      );
    });

    it('writes the days of the month', () => {
      const { onWrite } = setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleRepeat-monthly');
      click('workflowTriggerConfigScheduleMonthDay-15');

      expect(lastWrite(onWrite).rrule).toMatchObject({
        freq: 'MONTHLY',
        bymonthday: [1, 15],
      });
      expect(byId('workflowTriggerConfigScheduleSummary')).toHaveTextContent(
        'Every month on the 1st and the 15th at 07:00 UTC.'
      );
    });

    it('keeps the days of each repeat when going from one to another and back', () => {
      const { onWrite } = setup(weeklyOnMonday);

      click('workflowTriggerConfigScheduleRepeat-monthly');
      click('workflowTriggerConfigScheduleMonthDay-15');
      click('workflowTriggerConfigScheduleRepeat-weekly');

      expect(lastWrite(onWrite).rrule.byweekday).toEqual(['MO']);
      click('workflowTriggerConfigScheduleRepeat-monthly');
      expect(lastWrite(onWrite).rrule.bymonthday).toEqual([1, 15]);
    });

    it('goes back to the interval it had', () => {
      const { onWrite } = setup({ every: '2h' });

      click('workflowTriggerConfigScheduleMode-calendar');
      click('workflowTriggerConfigScheduleMode-interval');

      expect(lastWrite(onWrite)).toEqual({ every: '2h' });
    });
  });

  it('follows a schedule changed from somewhere else, such as the YAML tab', () => {
    setup(weeklyOnMonday);

    act(() => setExternal({ every: '1d' }));

    expect(byId('workflowTriggerConfigPanelEvery')).toHaveValue('1d');
  });

  it('leaves a schedule it cannot write back unchanged to the YAML, and offers no control', () => {
    const { onWrite } = setup({
      rrule: { freq: 'DAILY', interval: 1, tzid: 'UTC', dtstart: '2025-01-01T09:00:00.000Z' },
    });

    expect(byId('workflowTriggerConfigScheduleUnsupported')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowTriggerConfigScheduleMode')).not.toBeInTheDocument();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it('is inert when read-only', () => {
    setup(weeklyOnMonday, true);

    expect(byId('workflowTriggerConfigScheduleTime')).toBeDisabled();
    expect(byId('workflowTriggerConfigScheduleCount')).toBeDisabled();
    expect(byId('workflowTriggerConfigScheduleDay-MO')).toBeDisabled();
    expect(byId('workflowTriggerConfigScheduleMode-interval')).toBeDisabled();
  });
});
