/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import {
  COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ,
  ColumnarIndexModeSwitch,
} from './columnar_index_mode_switch';

const render = (props: Partial<React.ComponentProps<typeof ColumnarIndexModeSwitch>> = {}) =>
  createFleetTestRendererMock().render(
    <ColumnarIndexModeSwitch checked={false} onChange={jest.fn()} {...props} />
  );

describe('ColumnarIndexModeSwitch', () => {
  it('renders the label, the technical preview badge and the help text', () => {
    const result = render();

    expect(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ)).toBeInTheDocument();
    expect(result.getByText('Columnar index mode')).toBeInTheDocument();
    expect(result.getByText('Technical preview')).toBeInTheDocument();
    expect(
      result.getByText(/each field once, as doc values, with no inverted index/)
    ).toBeInTheDocument();
  });

  it('calls onChange when toggled', () => {
    const onChange = jest.fn();
    const result = render({ onChange });

    fireEvent.click(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ));

    expect(onChange).toHaveBeenCalled();
  });

  it('lists the unsupported data streams when there are any', () => {
    const result = render({ unsupportedDataStreams: ['Nginx error logs', 'Nginx audit logs'] });

    expect(result.getByTestId('columnarIndexModeUnsupportedDataStreams')).toHaveTextContent(
      'Nginx error logs, Nginx audit logs'
    );
  });

  it('explains why the switch is greyed out when the integration is not columnar-ready', () => {
    const result = render({ notReady: true, disabled: true, unsupportedDataStreams: ['x'] });

    expect(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ)).toBeDisabled();
    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );
    // The reason replaces the description rather than stacking under it.
    expect(result.queryByText(/stored once|each field once/)).not.toBeInTheDocument();
    expect(result.queryByTestId('columnarIndexModeUnsupportedDataStreams')).not.toBeInTheDocument();
  });

  it('names the data streams that keep a partly ready integration from being columnar-ready', () => {
    const result = render({
      disabled: true,
      notReady: true,
      notReadyDataStreams: ['Nginx error logs', 'Nginx debug logs'],
    });

    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready: Nginx error logs, Nginx debug logs don't support columnar storage yet, and every log data stream has to."
    );
  });

  it('replaces the description with the withdrawn notice', () => {
    const result = render({ withdrawn: true, disabled: true });

    expect(result.getByTestId('columnarIndexModeWithdrawn')).toBeInTheDocument();
    expect(result.queryByText(/each field once/)).not.toBeInTheDocument();
  });

  it('uses the singular for one unsupported data stream', () => {
    const result = render({ unsupportedDataStreams: ['Nginx error logs'] });

    expect(result.getByTestId('columnarIndexModeUnsupportedDataStreams')).toHaveTextContent(
      "Nginx error logs doesn't support columnar storage and stays on LogsDB."
    );
  });

  it('omits the unsupported line when there are none', () => {
    const result = render();

    expect(result.queryByTestId('columnarIndexModeUnsupportedDataStreams')).not.toBeInTheDocument();
  });
});
