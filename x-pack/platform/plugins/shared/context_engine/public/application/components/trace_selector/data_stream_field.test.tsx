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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...services, data }}>
          <DataStreamField {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
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
    jest.clearAllMocks();
  });

  it('loads data streams from the cluster and calls onChange when one is selected', async () => {
    const getIndices = jest.fn().mockResolvedValue([dataStreamIndex]);
    const onChange = jest.fn();
    renderField({ value: undefined, onChange }, getIndices);

    await waitFor(() => {
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*',
        isRollupIndex: expect.any(Function),
      });
    });

    fireEvent.change(screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!, {
      target: { value: 'logs' },
    });

    await waitFor(() => {
      expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('logs-genai-default'));

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-genai-default' });
  });

  it('shows a translated load error when getIndices rejects', async () => {
    const getIndices = jest.fn().mockRejectedValue(new Error('cluster exploded'));
    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    await waitFor(() => {
      expect(screen.getByText('Unable to load data streams.')).toBeInTheDocument();
    });
    expect(screen.queryByText('cluster exploded')).not.toBeInTheDocument();
  });

  it('does not apply a stale getIndices response after a newer request', async () => {
    const first = createDeferred<Array<typeof dataStreamIndex>>();
    const second = createDeferred<Array<typeof dataStreamIndex>>();
    let callCount = 0;
    const getIndices = jest.fn().mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? first.promise : second.promise;
    });

    renderField({ value: undefined, onChange: jest.fn() }, getIndices);

    await waitFor(() => {
      expect(getIndices).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!, {
      target: { value: 'logs' },
    });

    await waitFor(
      () => {
        expect(getIndices).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );

    second.resolve([
      {
        name: 'logs-newer',
        tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
        item: { name: 'logs-newer' },
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('logs-newer')).toBeInTheDocument();
    });

    first.resolve([
      {
        name: 'stale-stream',
        tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
        item: { name: 'stale-stream' },
      },
    ]);

    await waitFor(() => {
      expect(screen.queryByText('stale-stream')).not.toBeInTheDocument();
    });
    expect(screen.getByText('logs-newer')).toBeInTheDocument();
  });

  it('does not call onChange when creating an empty custom option', async () => {
    const onChange = jest.fn();
    renderField({ value: undefined, onChange });

    await waitFor(() => {
      expect(screen.getByTestId('contextTraceDataStreamComboBox')).toBeInTheDocument();
    });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange when creating a valid custom option', async () => {
    const onChange = jest.fn();
    renderField({ value: undefined, onChange });

    await waitFor(() => {
      expect(screen.getByTestId('contextTraceDataStreamComboBox')).toBeInTheDocument();
    });

    const input = screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!;
    fireEvent.change(input, { target: { value: 'logs-custom-valid' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-custom-valid' });
  });
});
