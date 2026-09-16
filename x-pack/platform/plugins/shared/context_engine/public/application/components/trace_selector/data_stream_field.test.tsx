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

const renderField = (
  props: React.ComponentProps<typeof DataStreamField>,
  getIndices = jest.fn().mockResolvedValue([
    {
      name: 'logs-genai-default',
      tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
      item: { name: 'logs-genai-default' },
    },
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

describe('DataStreamField', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads data streams from the cluster and calls onChange when one is selected', async () => {
    const getIndices = jest.fn().mockResolvedValue([
      {
        name: 'logs-genai-default',
        tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
        item: { name: 'logs-genai-default' },
      },
    ]);
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

  it('shows a validation error for an invalid custom data stream name', async () => {
    const onChange = jest.fn();
    renderField({ value: { type: 'index', value: 'bad index' }, onChange });

    expect(
      screen.getByText('Must be a valid Elasticsearch index, data stream, alias, or pattern name.')
    ).toBeInTheDocument();
  });
});
