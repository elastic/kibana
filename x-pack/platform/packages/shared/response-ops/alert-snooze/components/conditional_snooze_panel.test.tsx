/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiFieldText } from '@elastic/eui';
import moment from 'moment';
import { ConditionalSnoozePanel } from './conditional_snooze_panel';
import { SNOOZE_DATE_DISPLAY_FORMAT } from './constants';
import { DataConditionType, type DataConditionTypeDescriptor } from './types';
import { fieldChangeDescriptor, severityEqualsDescriptor } from './built_in_data_conditions';

const MOCKED_NOW = '2026-03-09T19:05:00.000Z';

jest.mock('moment', () => {
  const actual = jest.requireActual('moment');
  return Object.assign(
    (...args: unknown[]) => (args.length ? actual(...args) : actual(MOCKED_NOW)),
    actual,
    { tz: { guess: () => 'UTC' } }
  );
});

let mockValidationOverride: {
  isDurationInvalid: boolean;
  isPastDateTime: boolean;
  isDateTimeMissing: boolean;
} | null = null;
jest.mock('../utils/duration_validation', () => {
  const actual = jest.requireActual('../utils/duration_validation');
  return {
    ...actual,
    validateDuration: (...args: unknown[]) =>
      mockValidationOverride ?? actual.validateDuration(...args),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('ConditionalSnoozePanel', () => {
  const onScheduleChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationOverride = null;
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
        expiresAt: moment(MOCKED_NOW).add(1, 'h').toISOString(),
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
        expiresAt: moment(MOCKED_NOW).add(2, 'h').toISOString(),
      });
    });
  });

  describe('single data condition', () => {
    it('renders the data condition form', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(await screen.findByText('Data condition')).toBeInTheDocument();
      expect(screen.queryAllByTestId(/^dataConditionType-/)).toHaveLength(1);
    });

    it('"Add data condition" button persists after adding a condition', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(await screen.findByTestId('addDataCondition')).toBeInTheDocument();
    });

    it('confirm button is disabled when field or value is empty', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      // field_change requires a field value, which is initially empty
      expect(await screen.findByTestId(/^confirmDataCondition-/)).toBeDisabled();
    });

    it('reports undefined schedule when a data condition is added but not confirmed', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });

    it('shows chip view and reports a valid schedule after confirming a data condition', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      expect(await screen.findByText('Severity change')).toBeInTheDocument();
      expect(await screen.findByTestId(`editDataCondition-dc-1`)).toBeInTheDocument();
      expect(await screen.findByTestId(`deleteDataCondition-dc-1`)).toBeInTheDocument();
      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
        conditionOperator: 'any',
      });
    });

    it('truncates very long field names in the preview sentence', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      const longField = 'a'.repeat(80);
      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-1`), {
        target: { value: longField },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      const previewEl = await screen.findByTestId('conditionsPreviewText');
      expect(previewEl.textContent ?? '').not.toContain(longField);
      expect(previewEl).toHaveTextContent('…');
    });

    it('shows preview text after confirming a data condition', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is changed.'
      );
    });

    it('goes back to edit correctly', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));
      fireEvent.click(await screen.findByTestId(`editDataCondition-dc-1`));

      expect(await screen.findByTestId(`dataConditionType-dc-1`)).toBeInTheDocument();
    });

    it('removes the condition and reports undefined schedule when delete is clicked', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));
      fireEvent.click(await screen.findByTestId(`deleteDataCondition-dc-1`));

      expect(screen.queryByText('Severity change')).not.toBeInTheDocument();
      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('multiple data conditions', () => {
    it('shows ANY separator button between two conditions', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const separatorBtn = await screen.findByTestId('logicalOperator');
      expect(separatorBtn).toBeInTheDocument();
      expect(separatorBtn).toHaveTextContent('ANY');
    });

    it('toggles separator from ANY & ALL when clicked', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const separatorBtn = await screen.findByTestId('logicalOperator');
      fireEvent.click(separatorBtn);

      expect(separatorBtn).toHaveTextContent('ALL');
      fireEvent.click(separatorBtn);

      expect(separatorBtn).toHaveTextContent('ANY');
    });

    it('shows preview text combining multiple confirmed conditions with ANY', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is changed or field "status" is changed.'
      );
    });

    it('updates preview text to ALL when separator is toggled', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      fireEvent.click(await screen.findByTestId('logicalOperator'));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if severity is changed and field "status" is changed.'
      );
    });

    it('reports schedule with conditionOperator all when ALL separator is used', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionField-dc-2`), {
        target: { value: 'status' },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-2`));

      fireEvent.click(await screen.findByTestId('logicalOperator'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        conditions: [
          { type: DataConditionType.SEVERITY_CHANGE },
          { type: DataConditionType.FIELD_CHANGE, field: 'status' },
        ],
        conditionOperator: 'all',
      });
    });

    it('renders text instead of a button for the second separator', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.click(await screen.findByTestId('addDataCondition'));

      // The first separator should be a button
      expect(await screen.findByTestId('logicalOperator')).toBeInTheDocument();

      // The second separator should just be text (so we'd find ANY twice, once inside button, once inside text)
      const anyTexts = await screen.findAllByText('ANY');
      expect(anyTexts).toHaveLength(2);
    });
  });

  describe('confirmed time condition that becomes invalid', () => {
    it('reports undefined schedule when the only confirmed condition is a time that has aged past', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expiresAt: moment(MOCKED_NOW).add(1, 'h').toISOString(),
      });

      mockValidationOverride = {
        isDurationInvalid: false,
        isPastDateTime: true,
        isDateTimeMissing: false,
      };

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });

    it('reports undefined schedule when an invalid confirmed time coexists with valid data conditions', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expiresAt: moment(MOCKED_NOW).add(1, 'h').toISOString(),
        conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
        conditionOperator: 'any',
      });

      mockValidationOverride = {
        isDurationInvalid: false,
        isPastDateTime: true,
        isDateTimeMissing: false,
      };

      fireEvent.click(await screen.findByTestId('editDataCondition-dc-1'));
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('severity-equals warning (built-in `getWarning` descriptor hook)', () => {
    const addSeverityEquals = async (id: string, severity: string) => {
      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-${id}`), {
        target: { value: DataConditionType.SEVERITY_EQUALS },
      });
      fireEvent.change(await screen.findByTestId(`dataConditionValue-${id}`), {
        target: { value: severity },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-${id}`));
    };

    it('does not warn when multiple severity-equals conditions are combined with ANY', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });
      await addSeverityEquals('dc-1', 'critical');
      await addSeverityEquals('dc-2', 'info');

      expect(screen.queryByTestId('conflictingSeverityEqualsWarning')).not.toBeInTheDocument();
    });

    it('warns when distinct severity-equals values are combined with ALL', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });
      await addSeverityEquals('dc-1', 'critical');
      await addSeverityEquals('dc-2', 'info');
      fireEvent.click(await screen.findByTestId('logicalOperator'));

      expect(await screen.findByTestId('conflictingSeverityEqualsWarning')).toBeInTheDocument();
    });
  });

  describe('singleton descriptor filtering', () => {
    it('hides a singleton descriptor from the dropdown for new rows once one is added', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      // Second row should no longer see severity_change as a dropdown option.
      fireEvent.click(await screen.findByTestId('addDataCondition'));
      const secondTypeSelect = (await screen.findByTestId(
        'dataConditionType-dc-2'
      )) as HTMLSelectElement;
      const offeredOptions = Array.from(secondTypeSelect.options).map((o) => o.value);
      expect(offeredOptions).not.toContain(DataConditionType.SEVERITY_CHANGE);
      expect(offeredOptions).toContain(DataConditionType.FIELD_CHANGE);
      expect(offeredOptions).toContain(DataConditionType.SEVERITY_EQUALS);
    });
  });

  describe('custom `dataConditionTypes` prop', () => {
    const customAlwaysCompleteDescriptor: DataConditionTypeDescriptor = {
      id: 'custom_field_present',
      label: 'Custom: field present',
      isComplete: () => true,
      renderInput: (entry, onChange) => (
        <EuiFieldText
          value={entry.field}
          onChange={(e) => onChange({ ...entry, field: e.target.value })}
          placeholder="my custom field"
          data-test-subj={`customDescriptorInput-${entry.id}`}
        />
      ),
      renderConfirmedSummary: () => null,
      getPreviewText: (entry) => `custom field "${entry.field}" exists`,
      serialize: (entry) => ({
        type: 'custom_field_present',
        field: entry.field,
        marker: 'custom',
      }),
    };

    it('only renders dropdown options for descriptors passed in `dataConditionTypes`', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          dataConditionTypes={[fieldChangeDescriptor, customAlwaysCompleteDescriptor]}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      const typeSelect = (await screen.findByTestId('dataConditionType-dc-1')) as HTMLSelectElement;
      const offered = Array.from(typeSelect.options).map((o) => o.value);

      expect(offered).toEqual([DataConditionType.FIELD_CHANGE, 'custom_field_present']);
      expect(offered).not.toContain(DataConditionType.SEVERITY_CHANGE);
      expect(offered).not.toContain(DataConditionType.SEVERITY_EQUALS);
    });

    it('emits the custom condition shape returned by the descriptor', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          dataConditionTypes={[fieldChangeDescriptor, customAlwaysCompleteDescriptor]}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: 'custom_field_present' },
      });
      fireEvent.change(await screen.findByTestId('customDescriptorInput-dc-1'), {
        target: { value: 'host.name' },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        conditions: [{ type: 'custom_field_present', field: 'host.name', marker: 'custom' }],
        conditionOperator: 'any',
      });
    });

    it('renders the custom descriptor’s preview text in the live preview', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          dataConditionTypes={[fieldChangeDescriptor, customAlwaysCompleteDescriptor]}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId('dataConditionType-dc-1'), {
        target: { value: 'custom_field_present' },
      });
      fireEvent.change(await screen.findByTestId('customDescriptorInput-dc-1'), {
        target: { value: 'host.name' },
      });
      fireEvent.click(await screen.findByTestId('confirmDataCondition-dc-1'));

      expect(await screen.findByTestId('conditionsPreviewText')).toHaveTextContent(
        'Alert will unsnooze if custom field "host.name" exists.'
      );
    });

    it('uses the first descriptor in the list as the default type for new rows', async () => {
      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          dataConditionTypes={[severityEqualsDescriptor, fieldChangeDescriptor]}
        />,
        { wrapper }
      );

      fireEvent.click(await screen.findByTestId('addDataCondition'));

      const typeSelect = (await screen.findByTestId('dataConditionType-dc-1')) as HTMLSelectElement;
      expect(typeSelect.value).toBe(DataConditionType.SEVERITY_EQUALS);
    });

    it('surfaces a custom descriptor’s `getWarning` message in the warning callout', async () => {
      const alwaysWarningDescriptor: DataConditionTypeDescriptor = {
        ...customAlwaysCompleteDescriptor,
        id: 'always_warns',
        label: 'Always warns',
        getPreviewText: () => 'always warns',
        serialize: (entry) => ({ type: 'always_warns', field: entry.field }),
        getWarning: () => 'this descriptor always complains',
      };

      render(
        <ConditionalSnoozePanel
          onScheduleChange={onScheduleChangeMock}
          dataConditionTypes={[alwaysWarningDescriptor]}
        />,
        { wrapper }
      );

      expect(await screen.findByTestId('conflictingSeverityEqualsWarning')).toHaveTextContent(
        'this descriptor always complains'
      );
    });
  });

  describe('combined time + data conditions', () => {
    it('reports schedule with both expiresAt and conditions when both are confirmed', async () => {
      render(<ConditionalSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(await screen.findByTestId('addTimeCondition'));
      fireEvent.click(await screen.findByTestId('confirmTimeCondition'));

      fireEvent.click(await screen.findByTestId('addDataCondition'));
      fireEvent.change(await screen.findByTestId(`dataConditionType-dc-1`), {
        target: { value: DataConditionType.SEVERITY_CHANGE },
      });
      fireEvent.click(await screen.findByTestId(`confirmDataCondition-dc-1`));

      const expiresAt = moment(MOCKED_NOW).add(1, 'h').toISOString();
      const expiresAtFormatted = moment(expiresAt).format(SNOOZE_DATE_DISPLAY_FORMAT);

      expect(onScheduleChangeMock).toHaveBeenLastCalledWith({
        expiresAt,
        conditions: [{ type: DataConditionType.SEVERITY_CHANGE }],
        conditionOperator: 'any',
      });

      const previewEl = await screen.findByTestId('conditionsPreviewText');
      expect(previewEl).toHaveTextContent(
        `Alert will unsnooze if severity is changed, OR on ${expiresAtFormatted}.`
      );
    });
  });
});
