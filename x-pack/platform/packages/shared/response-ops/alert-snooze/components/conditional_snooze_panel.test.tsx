/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import moment from 'moment';
import { ConditionalSnoozePanel } from './conditional_snooze_panel';
import { SNOOZE_DATE_DISPLAY_FORMAT } from './constants';

const MOCKED_NOW = '2026-03-09T19:05:00.000Z';

jest.mock('moment', () => {
  const actual = jest.requireActual('moment');
  return Object.assign(
    (...args: unknown[]) => (args.length ? actual(...args) : actual(MOCKED_NOW)),
    actual,
    { tz: { guess: () => 'UTC' } }
  );
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const FIELD_OPTIONS = [
  { value: 'severity', text: 'severity' },
  { value: 'status', text: 'status' },
  { value: 'priority', text: 'priority' },
];

describe('ConditionalSnoozePanel', () => {
  const onScheduleChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders the conditions header', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(
        await screen.findByText('Alert is snoozed until conditions are met:')
      ).toBeInTheDocument();
    });

    it('renders add buttons for time and data conditions with OR separator', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(await screen.findByTestId('addTimeCondition')).toBeInTheDocument();
      expect(await screen.findByTestId('addDataCondition')).toBeInTheDocument();
      expect(await screen.findByText('OR')).toBeInTheDocument();
    });

    it('shows the footer hint text initially', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Add conditions to define when the alert will un-snooze.'
      );
    });

    it('reports null schedule when no conditions are active', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(onScheduleChangeMock).toHaveBeenCalledWith(undefined);
    });
  });

  describe('time condition', () => {
    it('shows the duration picker when time condition is added', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));

      expect(await screen.findByText('Time condition')).toBeInTheDocument();
      expect(await screen.findByTestId('buttonGroupModeOptions')).toBeInTheDocument();
      expect(screen.queryByTestId('addTimeCondition')).not.toBeInTheDocument();
    });

    it('reports a valid schedule after confirming the time condition', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expires_at: moment(MOCKED_NOW).add(1, 'h').toISOString(),
      });
    });

    it('shows time condition chip and preview after confirming', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      const expectedDate = moment(MOCKED_NOW).add(1, 'h').format(SNOOZE_DATE_DISPLAY_FORMAT);
      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        `Alert will unsnooze on ${expectedDate}`
      );
    });

    it('reports a schedule with the updated duration after changing the duration value', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.change(await screen.findByTestId('durationValue'), { target: { value: '2' } });
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expires_at: moment(MOCKED_NOW).add(2, 'h').toISOString(),
      });
    });
  });

  describe('single data condition', () => {
    it('renders the data condition form', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(await screen.findByText('Data condition')).toBeInTheDocument();
      expect(screen.queryAllByTestId(/^dataConditionField-/)).toHaveLength(1);
      expect(screen.queryAllByTestId(/^dataConditionOperator-/)).toHaveLength(1);
      expect(screen.queryAllByTestId(/^dataConditionValue-/)).toHaveLength(1);
    });

    it('"Add data condition" button persists after adding a condition', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(await screen.findByTestId('addDataCondition')).toBeInTheDocument();
    });

    it('confirm button is disabled when field or value is empty', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(await screen.findByTestId(/^confirmDataCondition-/)).toBeDisabled();
    });

    it('reports undefined schedule when a data condition is added but not confirmed', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });

    it('shows chip view and reports a valid schedule after confirming a data condition', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      expect(await screen.findByText('severity')).toBeInTheDocument();
      expect(await screen.findByText('low')).toBeInTheDocument();
      expect(await screen.findByTestId(`editDataCondition-dc-1`)).toBeInTheDocument();
      expect(await screen.findByTestId(`deleteDataCondition-dc-1`)).toBeInTheDocument();
      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        conditions: [{ type: 'field_equals', field: 'severity', value: 'low', negate: false }],
        condition_operator: 'all',
      });
    });

    it('shows preview text after confirming a data condition', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is low.'
      );
    });

    it('goes back to edit correctly', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));
      fireEvent.click(await screen.findByTestId(`editDataCondition-dc-1`));

      expect(await screen.findByTestId(`dataConditionField-dc-1`)).toBeInTheDocument();
    });

    it('removes the condition and reports undefined schedule when delete is clicked', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));
      fireEvent.click(await screen.findByTestId(`deleteDataCondition-dc-1`));

      expect(screen.queryByText('severity')).not.toBeInTheDocument();
      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('multiple data conditions', () => {
    it('shows AND separator button between two conditions', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const separatorBtn = await screen.findByTestId(/^logicalOperator-/);
      expect(separatorBtn).toBeInTheDocument();
      expect(separatorBtn).toHaveTextContent('AND');
    });

    it('toggles separator from AND & OR when clicked', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const separatorBtn = await screen.findByTestId(/^logicalOperator-/);
      fireEvent.click(separatorBtn);

      expect(separatorBtn).toHaveTextContent('OR');
      fireEvent.click(separatorBtn);

      expect(separatorBtn).toHaveTextContent('AND');
    });

    it('shows preview text combining multiple confirmed conditions with AND', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-2`), {
        target: { value: 'active' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is low AND status is active.'
      );
    });

    it('updates preview text to OR when separator is toggled', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-2`), {
        target: { value: 'active' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      fireEvent.click(await screen.findByTestId(/^logicalOperator-/));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is low OR status is active.'
      );
    });

    it('reports schedule with condition_operator all when AND separator is used', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-2`), {
        target: { value: 'active' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        conditions: [
          { type: 'field_equals', field: 'severity', value: 'low', negate: false },
          { type: 'field_equals', field: 'status', value: 'active', negate: false },
        ],
        condition_operator: 'all',
      });
    });
  });

  describe('combined time + data conditions', () => {
    it('reports schedule with both expires_at and conditions when both are confirmed', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          fieldOptions={FIELD_OPTIONS}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: 'severity' },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-dc-1`), {
        target: { value: 'low' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));
      const expiresAt = moment(MOCKED_NOW).add(1, 'h').toISOString();
      const expiresAtFormatted = moment(expiresAt).format(SNOOZE_DATE_DISPLAY_FORMAT);
      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expires_at: expiresAt,
        conditions: [{ type: 'field_equals', field: 'severity', value: 'low', negate: false }],
        condition_operator: 'all',
      });

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        `Alert will unsnooze if severity is low OR it is after ${expiresAtFormatted}.`
      );
    });
  });
});
