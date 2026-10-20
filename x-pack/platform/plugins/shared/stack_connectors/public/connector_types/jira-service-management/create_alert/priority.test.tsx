/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { Priority } from './priority';

describe('Priority', () => {
  const onChange = jest.fn();

  const options = {
    priority: undefined,
    onChange,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the priority selectable', () => {
    render(<Priority {...options} />);

    expect(screen.getByTestId('jsm-prioritySelect')).toBeInTheDocument();
  });

  it('calls onChange when P1 is selected', () => {
    render(<Priority {...options} />);

    fireEvent.change(screen.getByTestId('jsm-prioritySelect'), { target: { value: 'P1' } });

    expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "priority",
        "P1",
      ]
    `);
  });
});
