/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertSnoozePanelInline } from './alert_snooze_panel_inline';
import { DataConditionType, type DataConditionTypeDescriptor } from './types';
import { fieldChangeDescriptor } from './built_in_data_conditions';

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

describe('AlertSnoozePanelInline', () => {
  const onApplyMock = jest.fn();
  const onBackMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPanel = (props: Partial<React.ComponentProps<typeof AlertSnoozePanelInline>> = {}) =>
    render(<AlertSnoozePanelInline onApply={onApplyMock} onBack={onBackMock} {...props} />, {
      wrapper,
    });

  describe('rendering', () => {
    it('renders the form directly (no trigger) with the back button and the Quick tab by default', async () => {
      renderPanel();

      expect(screen.getByTestId('alertSnoozePanel')).toBeInTheDocument();
      expect(screen.getByTestId('alertSnoozePanelBack')).toBeInTheDocument();
      expect(await screen.findByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
      expect(
        screen.queryByText('Alert is snoozed until conditions are met:')
      ).not.toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('calls onBack when clicked', () => {
      renderPanel();

      fireEvent.click(screen.getByTestId('alertSnoozePanelBack'));

      expect(onBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('tabs', () => {
    it('switches between tabs', async () => {
      renderPanel();

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
      renderPanel();

      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledWith({ expiresAt: null });
    });

    it('emits a quick-snooze payload with `expiresAt` set for a preset duration', async () => {
      renderPanel();

      fireEvent.click(await screen.findByTitle('1h'));
      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledTimes(1);
      expect(onApplyMock.mock.calls[0][0]).toEqual({ expiresAt: expect.any(String) });
    });

    it('emits a conditional payload with `conditions` and `conditionOperator`', async () => {
      renderPanel();
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
      renderPanel();
      fireEvent.click(await screen.findByTestId('conditional'));

      expect(await screen.findByTestId('alertSnoozeApplyButton')).toBeDisabled();
    });

    it('forwards `dataConditionTypes` to ConditionalSnoozePanel and emits the custom payload shape', async () => {
      const customDescriptor: DataConditionTypeDescriptor = {
        id: 'custom_via_inline',
        label: 'Via inline',
        isComplete: () => true,
        renderInput: () => null,
        renderConfirmedSummary: () => null,
        getPreviewText: () => 'via inline',
        serialize: () => ({ type: 'custom_via_inline', marker: 'inline' }),
      };

      renderPanel({ dataConditionTypes: [fieldChangeDescriptor, customDescriptor] });
      fireEvent.click(await screen.findByTestId('conditional'));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: 'custom_via_inline' },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));
      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledWith({
        conditions: [{ type: 'custom_via_inline', marker: 'inline' }],
        conditionOperator: 'any',
      });
    });

    it('does not close/unmount itself after Apply (the host popover owns closing)', async () => {
      renderPanel();

      fireEvent.click(await screen.findByTestId('alertSnoozeApplyButton'));

      expect(onApplyMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('alertSnoozeTabs')).toBeInTheDocument();
    });
  });
});
