/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DataStreamField } from './data_stream_field';

const dataStreamIndex = {
  name: 'logs-genai-default',
  tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
  item: { name: 'logs-genai-default' },
};

const renderField = (
  props: React.ComponentProps<typeof DataStreamField>,
  getIndices = jest.fn().mockResolvedValue([
    dataStreamIndex,
    {
      name: 'metrics-foo',
      tags: [{ key: 'index', name: 'Index', color: 'default' }],
      item: { name: 'metrics-foo' },
    },
  ])
) => {
  const services = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = getIndices;
  const view = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...services, data }}>
          <DataStreamField {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { ...view, services };
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('DataStreamField', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('loads data streams from the cluster and calls onChange when one is selected', async () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    const onChange = jest.fn();
    renderField({ value: undefined, onChange }, getIndices);

    expect(getIndices).not.toHaveBeenCalled();

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lo' } });

    await waitFor(() => {
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*lo*',
        isRollupIndex: expect.any(Function),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('logs-genai-default'));

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-genai-default' });
  });

  it('does not call getIndices on mount', () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    expect(getIndices).not.toHaveBeenCalled();
  });

  it('calls getIndices with * once on first focus and not again on a second focus', async () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);

    await waitFor(() => {
      expect(getIndices).toHaveBeenCalledTimes(1);
    });
    expect(getIndices).toHaveBeenCalledWith({
      pattern: '*',
      isRollupIndex: expect.any(Function),
    });

    fireEvent.focus(input);

    expect(getIndices).toHaveBeenCalledTimes(1);
  });

  it('searches on a single character after focus', async () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'l' } });

    await waitFor(() => {
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*l*',
        isRollupIndex: expect.any(Function),
      });
    });
  });

  it('filters out suggestions that are not data streams', async () => {
    const getIndices = jest.fn().mockResolvedValue([
      dataStreamIndex,
      {
        name: 'metrics-foo',
        tags: [{ key: 'index', name: 'Index', color: 'default' }],
        item: { name: 'metrics-foo' },
      },
    ]);
    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lo' } });

    await waitFor(() => {
      expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    });
    expect(screen.queryByText('metrics-foo')).not.toBeInTheDocument();
  });

  it('shows a toast warning when getIndices throws', async () => {
    const getIndices = jest.fn().mockImplementation(() => {
      throw new Error('cluster exploded');
    });
    const { services } = renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lo' } });

    await waitFor(() => {
      expect(services.notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: 'Unable to load data streams.',
      });
    });
    expect(screen.queryByText('cluster exploded')).not.toBeInTheDocument();
  });

  it('does not apply a stale getIndices response after a newer request', async () => {
    jest.useFakeTimers();
    const focus = createDeferred<Array<typeof dataStreamIndex>>();
    const first = createDeferred<Array<typeof dataStreamIndex>>();
    const second = createDeferred<Array<typeof dataStreamIndex>>();
    let callCount = 0;
    const getIndices = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return focus.promise;
      }
      return callCount === 2 ? first.promise : second.promise;
    });

    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    expect(getIndices).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: 'aa' } });
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(getIndices).toHaveBeenCalledTimes(2);

    fireEvent.change(input, { target: { value: 'bb' } });
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(getIndices).toHaveBeenCalledTimes(3);

    await act(async () => {
      second.resolve([
        {
          name: 'logs-newer',
          tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
          item: { name: 'logs-newer' },
        },
      ]);
      await second.promise;
    });

    expect(screen.getByText('logs-newer')).toBeInTheDocument();

    await act(async () => {
      first.resolve([
        {
          name: 'stale-stream',
          tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
          item: { name: 'stale-stream' },
        },
      ]);
      await first.promise;
    });

    expect(screen.queryByText('stale-stream')).not.toBeInTheDocument();
    expect(screen.getByText('logs-newer')).toBeInTheDocument();
  });

  it('does not call onChange when typing a name that matches no option and pressing Enter', () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    const onChange = jest.fn();
    renderField({ value: undefined, onChange }, getIndices);

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!;
    fireEvent.change(input, { target: { value: 'not-a-real-stream' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
