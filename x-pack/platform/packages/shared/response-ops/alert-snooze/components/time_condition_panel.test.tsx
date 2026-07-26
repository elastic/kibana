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
  TimeConditionPanel,
  NEW_TIME_CONDITION,
  type TimeConditionState,
} from './time_condition_panel';

jest.mock('./snooze_duration_picker', () => ({
  SnoozeDurationPicker: ({
    onChange,
    isDurationInvalid,
    isDateTimeInvalid,
  }: {
    onChange: (update: Partial<TimeConditionState>) => void;
    isDurationInvalid: boolean;
    isDateTimeInvalid: boolean;
  }) => (
    <div data-test-subj="mockSnoozeDurationPicker">
      <button onClick={() => onChange({ value: 3, unit: 'd' })} data-test-subj="mockPickerUpdate">
        update
      </button>
      {isDurationInvalid ? <span>duration invalid</span> : null}
      {isDateTimeInvalid ? <span>datetime invalid</span> : null}
    </div>
  ),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const createValue = (overrides: Partial<TimeConditionState> = {}): TimeConditionState => ({
  status: 'editing',
  mode: 'duration',
  value: 1,
  unit: 'h',
  dateTime: null,
  ...overrides,
});

describe('TimeConditionPanel', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an add button when there is no time condition', () => {
    render(
      <TimeConditionPanel
        value={null}
        chipLabel=""
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('addTimeCondition')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('addTimeCondition'));

    expect(onChangeMock).toHaveBeenCalledWith(NEW_TIME_CONDITION);
  });

  it('renders the editing state and disables confirm when invalid', () => {
    render(
      <TimeConditionPanel
        value={createValue()}
        chipLabel=""
        isConditionInvalid
        isDurationInvalid
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByText('Time condition')).toBeInTheDocument();
    expect(screen.getByTestId('mockSnoozeDurationPicker')).toBeInTheDocument();
    expect(screen.getByTestId('confirmTimeCondition')).toBeDisabled();
    expect(screen.getByText('duration invalid')).toBeInTheDocument();
  });

  it('merges updates from the duration picker into the current value', () => {
    render(
      <TimeConditionPanel
        value={createValue()}
        chipLabel=""
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('mockPickerUpdate'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createValue({
        value: 3,
        unit: 'd',
      })
    );
  });

  it('confirms the time condition from edit mode', () => {
    render(
      <TimeConditionPanel
        value={createValue()}
        chipLabel=""
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('confirmTimeCondition'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createValue({
        status: 'confirmed',
      })
    );
  });

  it('removes the time condition from edit mode', () => {
    render(
      <TimeConditionPanel
        value={createValue()}
        chipLabel=""
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('removeTimeCondition'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  it('renders the confirmed chip state and allows editing', () => {
    render(
      <TimeConditionPanel
        value={createValue({ status: 'confirmed' })}
        chipLabel="After 1 hour"
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('timeConditionChip')).toBeInTheDocument();
    expect(screen.getByText('After 1 hour')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('editTimeCondition'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createValue({
        status: 'editing',
      })
    );
  });

  it('removes the time condition from confirmed mode', () => {
    render(
      <TimeConditionPanel
        value={createValue({ status: 'confirmed' })}
        chipLabel="After 1 hour"
        isConditionInvalid={false}
        isDurationInvalid={false}
        isDateTimeInvalid={false}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('removeTimeCondition'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });
});
