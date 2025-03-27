/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnomalyValueDisplay } from './anomaly_value_display';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';

jest.mock('../../formatters/format_value', () => ({
  formatValue: jest.fn((value, mlFunction, fieldFormat) => {
    if (fieldFormat && fieldFormat.convert) {
      return fieldFormat.convert(value, 'text');
    }
    return value.toString();
  }),
}));

jest.mock('./anomaly_value_utils', () => ({
  isTimeFunction: (fn: string) => fn === 'time_of_day' || fn === 'time_of_week',
  getTimeValueInfo: jest.fn((value) => ({
    formattedTime: '14:30',
    tooltipContent: 'January 1st 14:30',
    dayOffset: value > 86400 ? 1 : 0,
  })),
}));

const baseProps = {
  value: 42.5,
  function: 'mean',
  record: {
    job_id: 'test-job',
    result_type: 'record',
    probability: 0.5,
    record_score: 50,
    initial_record_score: 50,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1672531200000,
    function: 'mean',
    function_description: 'mean',
  },
};

describe('AnomalyValueDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Renders regular numeric value for non-time functions', () => {
    const { getByText } = render(<AnomalyValueDisplay {...baseProps} />);
    expect(getByText('42.5')).toBeInTheDocument();
  });

  it('Renders array values for non-time functions', () => {
    const props = {
      ...baseProps,
      value: [1.5, 2.5],
      function: 'lat_long',
    };

    const { getByText } = render(<AnomalyValueDisplay {...props} />);
    expect(getByText('1.5,2.5')).toBeInTheDocument();
  });

  it('Renders time value with tooltip for time_of_day function', async () => {
    const { getByText } = render(
      <AnomalyValueDisplay {...baseProps} value={52200} function="time_of_day" />
    );

    const element = getByText('14:30');
    expect(element).toBeInTheDocument();

    fireEvent.mouseOver(element);
    await waitForEuiToolTipVisible();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('January 1st 14:30');
  });

  it('Renders time value with day offset for time_of_day function', async () => {
    const { getByText } = render(
      <AnomalyValueDisplay {...baseProps} value={90000} function="time_of_day" />
    );

    const timeText = getByText('14:30');
    const offsetText = getByText('+1');

    expect(timeText).toBeInTheDocument();
    expect(offsetText).toBeInTheDocument();

    fireEvent.mouseOver(timeText);
    await waitForEuiToolTipVisible();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('January 1st 14:30');
  });

  it('Renders time value with tooltip for time_of_week function', async () => {
    const { getByText } = render(
      <AnomalyValueDisplay {...baseProps} value={126000} function="time_of_week" />
    );

    const element = getByText('14:30');
    expect(element).toBeInTheDocument();

    fireEvent.mouseOver(element);
    await waitForEuiToolTipVisible();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('January 1st 14:30');
  });

  it('Uses first value from array for time functions', () => {
    const { getByText, queryByText } = render(
      <AnomalyValueDisplay {...baseProps} value={[52200, 54000]} function="time_of_week" />
    );

    expect(getByText('14:30')).toBeInTheDocument();
    expect(queryByText('15:00')).not.toBeInTheDocument();
  });

  it('Handles custom field format for non-time functions', () => {
    const customFormat = {
      convert: jest.fn().mockReturnValue('42.50%'),
    };
    const { getByText } = render(<AnomalyValueDisplay {...baseProps} fieldFormat={customFormat} />);

    expect(getByText('42.50%')).toBeInTheDocument();
  });
});
