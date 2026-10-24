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

  it('is greyed out, with the reason instead of the description, when the integration is not ready', () => {
    const result = render({ notReady: true });

    const switchEl = result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ);
    expect(switchEl).toBeDisabled();
    expect(switchEl).not.toBeChecked();
    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );
    expect(result.queryByText(/each field once/)).not.toBeInTheDocument();
  });

  it('names the data streams that keep a partly ready integration from being columnar-ready', () => {
    const result = render({
      notReady: true,
      notReadyDataStreams: ['Nginx error logs', 'Nginx debug logs'],
    });

    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready: Nginx error logs, Nginx debug logs don't support columnar storage yet, and every log data stream has to."
    );
  });

  it('stays on and can be turned off when an integration on columnar is no longer ready', () => {
    const onChange = jest.fn();
    const result = render({
      checked: true,
      notReady: true,
      notReadyDataStreams: ['Nginx error logs'],
      onChange,
    });

    const switchEl = result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ);
    expect(switchEl).toBeChecked();
    expect(switchEl).not.toBeDisabled();
    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready anymore: Nginx error logs doesn't support columnar storage. You can turn the columnar index mode off, but not back on until every log data stream is ready."
    );

    fireEvent.click(switchEl);
    expect(onChange).toHaveBeenCalled();
  });
});
