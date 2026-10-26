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
  it('renders the label, the technical preview badge and the help text with the docs link', () => {
    const result = render();

    expect(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ)).toBeInTheDocument();
    expect(result.getByText('Columnar index mode')).toBeInTheDocument();
    expect(result.getByText('Technical preview')).toBeInTheDocument();
    expect(result.getByText(/Enable LogsDB columnar mode\./)).toBeInTheDocument();
    expect(result.getByRole('link', { name: /Learn more/ })).toHaveAttribute(
      'href',
      expect.stringContaining('reference/elasticsearch/columnar')
    );
  });

  it('calls onChange when toggled', () => {
    const onChange = jest.fn();
    const result = render({ onChange });

    fireEvent.click(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ));

    expect(onChange).toHaveBeenCalled();
  });

  it('is greyed out, with the reason and the docs link instead of the description, when the integration is not ready', () => {
    const result = render({ notReady: true });

    const switchEl = result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ);
    expect(switchEl).toBeDisabled();
    expect(switchEl).not.toBeChecked();
    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );
    expect(result.getByRole('link', { name: /Learn more/ })).toBeInTheDocument();
    expect(result.queryByText(/Enable LogsDB columnar mode/)).not.toBeInTheDocument();
  });

  it('stays on and can be turned off when an integration on columnar is no longer ready', () => {
    const onChange = jest.fn();
    const result = render({ checked: true, notReady: true, onChange });

    const switchEl = result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ);
    expect(switchEl).toBeChecked();
    expect(switchEl).not.toBeDisabled();
    expect(result.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );

    fireEvent.click(switchEl);
    expect(onChange).toHaveBeenCalled();
  });
});
