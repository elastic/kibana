/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertSnoozePopover } from './alert_snooze_popover';
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

describe('AlertSnoozePopover', () => {
  const onApplyMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openPopover = async () => {
    fireEvent.click(await screen.findByTestId('alertSnoozePopoverTrigger'));
  };

  describe('trigger', () => {
    it('renders the default trigger button and toggles the popover when clicked', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });

      expect(screen.queryByTestId('alertSnoozeTabs')).not.toBeInTheDocument();

      await openPopover();

      expect(await screen.findByTestId('alertSnoozeTabs')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('opens on the Quick tab by default', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();

      expect(await screen.findByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
      expect(
        screen.queryByText('Alert is snoozed until conditions are met:')
      ).not.toBeInTheDocument();
    });

    it('switches between tabs', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();

      fireEvent.click(await screen.findByTestId('conditional'));
      expect(
        await screen.findByText('Alert is snoozed until conditions are met:')
      ).toBeInTheDocument();

      fireEvent.click(await screen.findByTestId('quick'));
      expect(await screen.findByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
    });
  });

  describe('Apply', () => {
    it('emits a quick-snooze payload with `expiresAt: null` for indefinite snooze', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();

      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledWith({ expiresAt: null });
    });

    it('emits a quick-snooze payload with `expiresAt` set for a preset duration', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();

      fireEvent.click(await screen.findByTitle('1h'));
      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledTimes(1);
      const payload = onApplyMock.mock.calls[0][0];
      expect(payload).toEqual({ expiresAt: expect.any(String) });
    });

    it('emits a conditional payload with `conditions` and `conditionOperator`', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();
      fireEvent.click(await screen.findByTestId('conditional'));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledWith({
        conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
        conditionOperator: 'any',
      });
    });

    it('disables Apply when the active tab has no valid configuration', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();
      fireEvent.click(await screen.findByTestId('conditional'));

      expect(await screen.findByTestId('alertSnoozeApplyButton')).toBeDisabled();
    });

    it('forwards `fieldOptions` to the field_change dropdown and emits the field_change payload', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(<AlertSnoozePopover onApply={onApplyMock} fieldOptions={['host.name']} />, {
        wrapper,
      });
      await openPopover();
      fireEvent.click(await screen.findByTestId('conditional'));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      const combo = within(await screen.findByTestId('dataConditionField-dc-1')).getByTestId(
        'comboBoxSearchInput'
      );
      await user.click(combo);
      await user.click(await screen.findByText('host.name'));
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));
      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledWith({
        conditions: [{ type: DataConditionType.FIELD_CHANGE, field: 'host.name' }],
        conditionOperator: 'any',
      });
    });

    it('closes the popover after Apply', async () => {
      render(<AlertSnoozePopover onApply={onApplyMock} />, { wrapper });
      await openPopover();

      // While open the EUI popover panel sets `data-popover-open="true"`
      // (asynchronously after a layout effect). After close, EUI keeps the
      // panel mounted in JSDOM but removes the attribute, so we assert on
      // that rather than panel presence.
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('data-popover-open', 'true');
      });

      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).not.toHaveAttribute('data-popover-open');
      });
    });
  });
});
