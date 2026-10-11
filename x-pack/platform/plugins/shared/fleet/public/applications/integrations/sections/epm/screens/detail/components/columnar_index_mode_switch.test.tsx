/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import {
  COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ,
  ColumnarIndexModeSwitch,
} from './columnar_index_mode_switch';

const render = (props: Partial<React.ComponentProps<typeof ColumnarIndexModeSwitch>> = {}) =>
  createIntegrationsTestRendererMock().render(
    <ColumnarIndexModeSwitch checked={false} onChange={jest.fn()} {...props} />
  );

describe('ColumnarIndexModeSwitch', () => {
  it('renders the label, the technical preview badge and the help text', () => {
    const result = render();

    expect(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ)).toBeInTheDocument();
    expect(result.getByText('Columnar index mode')).toBeInTheDocument();
    expect(result.getByText('Technical preview')).toBeInTheDocument();
    expect(
      result.getByText(/fields are stored once as doc values, with no inverted index/)
    ).toBeInTheDocument();
  });

  it('calls onChange when toggled', () => {
    const onChange = jest.fn();
    const result = render({ onChange });

    fireEvent.click(result.getByTestId(COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ));

    expect(onChange).toHaveBeenCalled();
  });

  it('lists the unsupported data streams when there are any', () => {
    const result = render({ unsupportedDataStreams: ['nginx.error', 'nginx.audit'] });

    expect(result.getByTestId('columnarIndexModeUnsupportedDataStreams')).toHaveTextContent(
      'nginx.error, nginx.audit'
    );
  });

  it('omits the unsupported line when there are none', () => {
    const result = render();

    expect(result.queryByTestId('columnarIndexModeUnsupportedDataStreams')).not.toBeInTheDocument();
  });
});
