/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DataStreamField } from './data_stream_field';

interface UseIndicesArgs {
  search: string;
  enabled: boolean;
  types: string[];
}

const mockUseIndices = jest.fn();

jest.mock('../../hooks/use_indices', () => ({
  useIndices: (args: UseIndicesArgs) => mockUseIndices(args),
}));

const defaultHookResult = {
  indexNames: ['logs-genai-default'],
  isFetching: false,
};

const renderField = (props: React.ComponentProps<typeof DataStreamField>) => {
  const services = coreMock.createStart();
  const view = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <DataStreamField {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { ...view, services };
};

const lastHookArgs = (): UseIndicesArgs | undefined => {
  const calls = mockUseIndices.mock.calls;
  return calls[calls.length - 1]?.[0];
};

describe('DataStreamField', () => {
  beforeEach(() => {
    mockUseIndices.mockReturnValue(defaultHookResult);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not enable the search hook before first focus', () => {
    renderField({ value: undefined, onChange: jest.fn() });

    expect(mockUseIndices.mock.calls[0]?.[0]).toEqual({
      search: '',
      enabled: false,
      types: ['data_stream'],
    });
  });

  it('enables the search hook with an empty search on first focus', () => {
    renderField({ value: undefined, onChange: jest.fn() });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input');
    if (!input) {
      throw new Error('expected combobox input');
    }
    fireEvent.focus(input);

    expect(lastHookArgs()).toEqual({ search: '', enabled: true, types: ['data_stream'] });
  });

  it('updates search passed to the hook only after the debounce delay', async () => {
    jest.useFakeTimers();
    renderField({ value: undefined, onChange: jest.fn() });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input');
    if (!input) {
      throw new Error('expected combobox input');
    }
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lo' } });

    expect(lastHookArgs()).toEqual({ search: '', enabled: true, types: ['data_stream'] });

    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(lastHookArgs()).toEqual({ search: '', enabled: true, types: ['data_stream'] });

    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(lastHookArgs()).toEqual({ search: 'lo', enabled: true, types: ['data_stream'] });
  });

  it('renders options that match the hook indexNames', () => {
    mockUseIndices.mockReturnValue({
      ...defaultHookResult,
      indexNames: ['logs-genai-default', 'logs-other'],
    });
    renderField({ value: undefined, onChange: jest.fn() });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input');
    if (!input) {
      throw new Error('expected combobox input');
    }
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lo' } });

    expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    expect(screen.getByText('logs-other')).toBeInTheDocument();
  });

  it('calls onChange when a data stream is selected', () => {
    const onChange = jest.fn();
    renderField({ value: undefined, onChange });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input');
    if (!input) {
      throw new Error('expected combobox input');
    }
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'logs' } });
    fireEvent.click(screen.getByText('logs-genai-default'));

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-genai-default' });
  });

  it('does not call onChange when typing a name that matches no option and pressing Enter', () => {
    const onChange = jest.fn();
    renderField({ value: undefined, onChange });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input');
    if (!input) {
      throw new Error('expected combobox input');
    }
    fireEvent.change(input, { target: { value: 'not-a-real-stream' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
