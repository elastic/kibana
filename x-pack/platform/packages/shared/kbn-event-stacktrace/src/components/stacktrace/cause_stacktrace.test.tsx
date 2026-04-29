/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { CauseStacktrace } from './cause_stacktrace';
import { renderWithTheme } from '../../utils/test_helpers';

describe('CauseStacktrace', () => {
  it('with no stack trace renders without the accordion', () => {
    const props = { id: 'testId', message: 'testMessage' };

    renderWithTheme(<CauseStacktrace {...props} />);

    expect(screen.getByText('testMessage')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); // Accordion button should not exist
  });

  it('with no message and a stack trace says "Caused by …"', () => {
    const props = {
      id: 'testId',
      stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
    };

    renderWithTheme(<CauseStacktrace {...props} />);

    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('with a message and a stack trace renders with the accordion', () => {
    const props = {
      id: 'testId',
      message: 'testMessage',
      stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
    };

    renderWithTheme(<CauseStacktrace {...props} />);

    expect(screen.getByRole('button')).toBeInTheDocument(); // Accordion button should exist
    expect(screen.getByText('testMessage')).toBeInTheDocument();
  });
});
