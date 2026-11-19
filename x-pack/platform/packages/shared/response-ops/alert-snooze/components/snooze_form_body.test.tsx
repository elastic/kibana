/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SnoozeFormBody } from './snooze_form_body';
import { DataConditionType } from './types';

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

describe('SnoozeFormBody', () => {
  const onTabChange = jest.fn();
  const onQuickScheduleChange = jest.fn();
  const onConditionalScheduleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderBody = (props: Partial<React.ComponentProps<typeof SnoozeFormBody>> = {}) =>
    render(
      <SnoozeFormBody
        activeTab="quick"
        onTabChange={onTabChange}
        onQuickScheduleChange={onQuickScheduleChange}
        onConditionalScheduleChange={onConditionalScheduleChange}
        {...props}
      />,
      { wrapper }
    );

  describe('tab rendering', () => {
    it('renders the tabs and the Quick panel when activeTab is "quick"', async () => {
      renderBody({ activeTab: 'quick' });

      expect(screen.getByTestId('alertSnoozeTabs')).toBeInTheDocument();
      expect(await screen.findByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
      expect(
        screen.queryByText('Alert is snoozed until conditions are met:')
      ).not.toBeInTheDocument();
    });

    it('renders the Conditional panel when activeTab is "conditional"', async () => {
      renderBody({ activeTab: 'conditional' });

      expect(
        await screen.findByText('Alert is snoozed until conditions are met:')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('quickSnoozeDurationOptions')).not.toBeInTheDocument();
    });
  });

  describe('tab change', () => {
    it('calls onTabChange with the selected tab id', async () => {
      renderBody({ activeTab: 'quick' });

      fireEvent.click(await screen.findByTestId('conditional'));

      expect(onTabChange).toHaveBeenCalledWith('conditional');
    });
  });

  describe('schedule change forwarding', () => {
    it('forwards quick-duration changes via onQuickScheduleChange', async () => {
      renderBody({ activeTab: 'quick' });

      fireEvent.click(await screen.findByTitle('1h'));

      expect(onQuickScheduleChange).toHaveBeenCalledWith(expect.any(String));
    });

    it('forwards conditional changes and passes fieldOptions to the field_change dropdown', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderBody({ activeTab: 'conditional', fieldOptions: ['host.name'] });

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const combo = within(await screen.findByTestId('dataConditionField-dc-1')).getByTestId(
        'comboBoxSearchInput'
      );
      await user.click(combo);
      await user.click(await screen.findByText('host.name'));
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      expect(onConditionalScheduleChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          conditions: [{ type: DataConditionType.FIELD_CHANGE, field: 'host.name' }],
          conditionOperator: 'any',
        })
      );
    });

    it('supports the built-in severity-change condition type', async () => {
      renderBody({ activeTab: 'conditional' });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      expect(onConditionalScheduleChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
          conditionOperator: 'any',
        })
      );
    });
  });
});
