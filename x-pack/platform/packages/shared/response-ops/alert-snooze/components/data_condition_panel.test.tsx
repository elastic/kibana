/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_MAJOR,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_MEDIUM,
  ALERT_SEVERITY_MINOR,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_WARNING,
  ALERT_SEVERITY_INFO,
} from '@kbn/rule-data-utils';
import { EuiFieldText } from '@elastic/eui';
import { DataConditionPanel } from './data_condition_panel';
import type { DataConditionEntry, DataConditionTypeDescriptor } from './types';
import { DataConditionType } from './types';
import {
  createFieldChangeDescriptor,
  severityChangeDescriptor,
  severityEqualsDescriptor,
} from './built_in_data_conditions';

const fieldChangeDescriptor = createFieldChangeDescriptor();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const createEntry = (overrides: Partial<DataConditionEntry> = {}): DataConditionEntry => ({
  id: 'dc-1',
  type: DataConditionType.FIELD_CHANGE,
  field: '',
  value: 'critical',
  confirmed: false,
  ...overrides,
});

describe('DataConditionPanel', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editable inputs when the entry is not confirmed', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    expect(screen.getByTestId('dataConditionType-dc-1')).toBeTruthy();
    expect(screen.getByTestId('dataConditionField-dc-1')).toBeTruthy();
    expect(screen.getByTestId('confirmDataCondition-dc-1').closest('button')?.disabled).toBe(true);
  });

  it('calls onChange with entry updates from the type dropdown', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    fireEvent.change(screen.getByTestId('dataConditionType-dc-1'), {
      target: { value: DataConditionType.SEVERITY_EQUALS },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        type: DataConditionType.SEVERITY_EQUALS,
      })
    );
  });

  it('confirms the entry once the condition is complete', () => {
    render(
      <DataConditionPanel
        entry={createEntry({ type: DataConditionType.FIELD_CHANGE, field: 'severity' })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('confirmDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        type: DataConditionType.FIELD_CHANGE,
        field: 'severity',
        confirmed: true,
      })
    );
  });

  it('removes the entry from edit mode', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    fireEvent.click(screen.getByTestId('removeDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  it('renders the confirmed chip state and allows editing', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          type: DataConditionType.FIELD_CHANGE,
          field: 'severity',
          confirmed: true,
        })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('dataConditionChip-dc-1')).toBeTruthy();
    expect(screen.getByText('Field change')).toBeTruthy();
    expect(screen.getByText('severity')).toBeTruthy();

    fireEvent.click(screen.getByTestId('editDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        type: DataConditionType.FIELD_CHANGE,
        field: 'severity',
        confirmed: false,
      })
    );
  });

  it('truncates very long field names in the confirmed chip and exposes the full value via `title`', () => {
    const longField = 'a'.repeat(80);
    render(
      <DataConditionPanel
        entry={createEntry({
          type: DataConditionType.FIELD_CHANGE,
          field: longField,
          confirmed: true,
        })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    const badge = screen.getByTitle(longField);
    expect(badge.textContent ?? '').toMatch(/…$/);
    expect((badge.textContent ?? '').length).toBeLessThan(longField.length);
  });

  it('removes the entry from confirmed mode', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          type: DataConditionType.FIELD_CHANGE,
          field: 'severity',
          confirmed: true,
        })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('deleteDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  describe('descriptor-driven rendering', () => {
    it('renders nothing if the entry type has no matching descriptor', () => {
      const { container } = render(
        <DataConditionPanel
          entry={createEntry({ type: 'unknown_descriptor_id' as DataConditionType })}
          descriptors={[fieldChangeDescriptor]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders the descriptor’s `renderInput` output in edit mode', () => {
      const customDescriptor: DataConditionTypeDescriptor = {
        id: 'custom_input_descriptor',
        label: 'Custom input',
        isComplete: () => true,
        renderInput: (entry, onChange) => (
          <EuiFieldText
            data-test-subj={`customDescriptorInput-${entry.id}`}
            value={entry.field}
            onChange={(e) => onChange({ ...entry, field: e.target.value })}
          />
        ),
        renderConfirmedSummary: () => null,
        getPreviewText: () => '',
        serialize: (entry) => ({
          type: 'custom_input_descriptor',
          field: entry.field,
        }),
      };

      render(
        <DataConditionPanel
          entry={createEntry({ type: 'custom_input_descriptor' as DataConditionType })}
          descriptors={[customDescriptor]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('customDescriptorInput-dc-1')).toBeInTheDocument();
    });

    it('renders the descriptor’s `renderConfirmedSummary` output in chip mode', () => {
      const customDescriptor: DataConditionTypeDescriptor = {
        id: 'custom_summary_descriptor',
        label: 'Custom summary',
        isComplete: () => true,
        renderInput: () => null,
        renderConfirmedSummary: (entry) => (
          <span data-test-subj={`customSummary-${entry.id}`}>summary for {entry.field}</span>
        ),
        getPreviewText: () => '',
        serialize: (entry) => ({
          type: 'custom_summary_descriptor',
          field: entry.field,
        }),
      };

      render(
        <DataConditionPanel
          entry={createEntry({
            type: 'custom_summary_descriptor' as DataConditionType,
            field: 'host.name',
            confirmed: true,
          })}
          descriptors={[customDescriptor]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      const summary = screen.getByTestId('customSummary-dc-1');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('summary for host.name');
    });

    it('drives the confirm-button enable state from the descriptor’s `isComplete`', () => {
      const alwaysCompleteDescriptor: DataConditionTypeDescriptor = {
        id: 'always_complete',
        label: 'Always complete',
        isComplete: () => true,
        renderInput: () => null,
        renderConfirmedSummary: () => null,
        getPreviewText: () => '',
        serialize: () => ({ type: 'always_complete' }),
      };

      render(
        <DataConditionPanel
          entry={createEntry({
            type: 'always_complete' as DataConditionType,
            field: '',
            value: undefined,
          })}
          descriptors={[alwaysCompleteDescriptor]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('confirmDataCondition-dc-1').closest('button')?.disabled).toBe(
        false
      );
    });
  });

  describe('`disabledTypes` prop', () => {
    it('hides ids listed in `disabledTypes` from the dropdown', () => {
      render(
        <DataConditionPanel
          entry={createEntry({ type: DataConditionType.FIELD_CHANGE })}
          descriptors={[fieldChangeDescriptor, severityChangeDescriptor]}
          disabledTypes={[DataConditionType.SEVERITY_CHANGE]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      const select = screen.getByTestId('dataConditionType-dc-1') as HTMLSelectElement;
      const offered = Array.from(select.options).map((o) => o.value);
      expect(offered).toContain(DataConditionType.FIELD_CHANGE);
      expect(offered).not.toContain(DataConditionType.SEVERITY_CHANGE);
    });

    it('still keeps the entry’s own current type visible even if it is in `disabledTypes`', () => {
      render(
        <DataConditionPanel
          entry={createEntry({ type: DataConditionType.SEVERITY_CHANGE })}
          descriptors={[fieldChangeDescriptor, severityChangeDescriptor]}
          disabledTypes={[DataConditionType.SEVERITY_CHANGE]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      const select = screen.getByTestId('dataConditionType-dc-1') as HTMLSelectElement;
      const offered = Array.from(select.options).map((o) => o.value);
      expect(offered).toContain(DataConditionType.SEVERITY_CHANGE);
      expect(offered).toContain(DataConditionType.FIELD_CHANGE);
    });
  });

  describe('severity_equals dropdown', () => {
    it('lists the full severity superset in highest → lowest order', () => {
      render(
        <DataConditionPanel
          entry={createEntry({ type: DataConditionType.SEVERITY_EQUALS, value: undefined })}
          descriptors={[severityEqualsDescriptor]}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      const select = screen.getByTestId('dataConditionValue-dc-1') as HTMLSelectElement;
      const offered = Array.from(select.options)
        .map((o) => o.value)
        .filter(Boolean);

      expect(offered).toEqual([
        ALERT_SEVERITY_CRITICAL,
        ALERT_SEVERITY_MAJOR,
        ALERT_SEVERITY_HIGH,
        ALERT_SEVERITY_MEDIUM,
        ALERT_SEVERITY_MINOR,
        ALERT_SEVERITY_LOW,
        ALERT_SEVERITY_WARNING,
        ALERT_SEVERITY_INFO,
      ]);
    });
  });
});
