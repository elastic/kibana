/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EditDatafeedTab } from './edit_datafeed_tab';

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({ services: {} }),
}));

jest.mock('../../../../../services/ml_server_info', () => ({
  getIsMlCpsEnabled: () => false,
  getNewJobDefaults: () => ({ datafeeds: { scroll_size: 1000 } }),
}));

jest.mock('../../ml_job_editor', () => ({
  ML_EDITOR_MODE: { TEXT: 'text', XJSON: 'xjson' },
  MLJobEditor: ({ value, readOnly, mode }: { value: string; readOnly: boolean; mode: string }) => (
    <div data-test-subj="mlJobEditor" data-mode={mode} data-read-only={String(readOnly)}>
      {value}
    </div>
  ),
}));

const defaultProps = {
  datafeedRunning: false,
  datafeedQuery: '{\n  "match_all": {}\n}',
  datafeedQueryDelay: '60s',
  datafeedFrequency: '300s',
  datafeedScrollSize: 1000,
  datafeedProjectRouting: undefined,
  jobBucketSpan: '15m',
  setDatafeed: jest.fn(),
  isEsqlDatafeed: false,
};

const renderTab = (props = {}) =>
  render(
    <I18nProvider>
      <EditDatafeedTab {...defaultProps} {...props} />
    </I18nProvider>
  );

describe('EditDatafeedTab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows an ES|QL query as read-only while allowing operational updates', () => {
    const setDatafeed = jest.fn();
    renderTab({
      isEsqlDatafeed: true,
      datafeedQuery: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
      setDatafeed,
    });

    expect(screen.getByText(/create a new job and datafeed/i)).toBeInTheDocument();
    expect(screen.getByTestId('mlJobEditor')).toHaveAttribute('data-mode', 'text');
    expect(screen.getByTestId('mlJobEditor')).toHaveAttribute('data-read-only', 'true');
    expect(screen.queryByLabelText('Scroll size')).not.toBeInTheDocument();

    const [queryDelayInput, frequencyInput] = screen.getAllByRole('textbox');
    fireEvent.change(queryDelayInput, { target: { value: '120s' } });
    fireEvent.change(frequencyInput, { target: { value: '600s' } });

    expect(setDatafeed).toHaveBeenCalledWith({ datafeedQueryDelay: '120s' });
    expect(setDatafeed).toHaveBeenCalledWith({ datafeedFrequency: '600s' });
  });

  it('keeps classic queries editable and scroll size available while stopped', () => {
    renderTab();

    expect(screen.queryByText(/create a new job and datafeed/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('mlJobEditor')).toHaveAttribute('data-mode', 'xjson');
    expect(screen.getByTestId('mlJobEditor')).toHaveAttribute('data-read-only', 'false');
    expect(screen.getByLabelText('Scroll size')).toBeEnabled();
  });
});
