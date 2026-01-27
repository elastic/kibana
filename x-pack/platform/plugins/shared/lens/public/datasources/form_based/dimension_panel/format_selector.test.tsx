/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormatSelectorProps } from './format_selector';
import { FormatSelector } from './format_selector';
import type { GenericIndexPatternColumn } from '../../..';
import { renderWithProviders } from '../../../test_utils/test_utils';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

const props = {
  onChange: jest.fn(),
  selectedColumn: {
    label: 'Max of bytes',
    dataType: 'number',
    isBucketed: false,

    // Private
    operationType: 'max',
    sourceField: 'bytes',
    params: { format: { id: 'bytes' } },
  } as GenericIndexPatternColumn,
  docLinks: docLinksServiceMock.createStartContract(),
};

const renderFormatSelector = (propsOverrides?: Partial<FormatSelectorProps>) => {
  return renderWithProviders(<FormatSelector {...props} {...propsOverrides} />);
};

describe('FormatSelector', () => {
  let user: UserEvent;

  beforeEach(() => {
    (props.onChange as jest.Mock).mockClear();
    jest.useFakeTimers();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it('updates the format decimals', async () => {
    renderFormatSelector();
    await user.type(screen.getByLabelText('Decimals'), '{backspace}10');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 10 } });
  });
  it('updates the format decimals to upper range when input exceeds the range', async () => {
    renderFormatSelector();
    await user.type(screen.getByLabelText('Decimals'), '{backspace}20');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 15 } });
  });
  it('updates the format decimals to lower range when input is smaller than range', async () => {
    renderFormatSelector();
    await user.type(screen.getByLabelText('Decimals'), '{backspace}-2');
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 0 } });
  });
  it('updates the suffix', async () => {
    renderFormatSelector();
    await user.type(screen.getByTestId('indexPattern-dimension-formatSuffix'), 'GB');
    jest.advanceTimersByTime(256);
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { suffix: 'GB' } });
  });

  describe('Duration', () => {
    it('hides the decimals and compact controls for humanize approximate output', async () => {
      renderFormatSelector({
        selectedColumn: {
          ...props.selectedColumn,
          params: { format: { id: 'duration' } },
        },
      });
      expect(screen.queryByLabelText('Decimals')).toBeNull();
      expect(screen.queryByTestId('lns-indexpattern-dimension-formatCompact')).toBeNull();

      const durationEndInput = within(
        screen.getByTestId('indexPattern-dimension-duration-end')
      ).getByRole('combobox');
      await user.click(durationEndInput);
      fireEvent.click(screen.getByText('Hours'));
      jest.advanceTimersByTime(256);
      expect(props.onChange).toBeCalledWith({
        id: 'duration',
        params: { toUnit: 'asHours' },
      });

      expect(screen.queryByLabelText('Decimals')).toHaveValue(2);
      expect(screen.queryByTestId('lns-indexpattern-dimension-formatCompact')).toBeInTheDocument();
    });

    it('sets compact to true by default when selecting duration format', async () => {
      renderFormatSelector({
        selectedColumn: {
          ...props.selectedColumn,
          params: { format: { id: 'number' } },
        },
      });

      // Change format from number to duration
      const formatInput = within(screen.getByTestId('indexPattern-dimension-format')).getByRole(
        'combobox'
      );
      await user.click(formatInput);
      fireEvent.click(screen.getByText('Duration'));

      expect(props.onChange).toBeCalledWith({
        id: 'duration',
        params: { decimals: 0, compact: true },
      });
    });
  });
});
