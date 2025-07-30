/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/react';
import React from 'react';
import { screen } from '@testing-library/react';
import * as stories from './exception_stacktrace.stories';
import { renderWithTheme } from '../../../utils/test_helpers';

const { JavaWithLongLines } = composeStories(stories);

describe('ExceptionStacktrace', () => {
  it('with stack traces renders the stacktraces', () => {
    renderWithTheme(<JavaWithLongLines />);
    const stacktraces = screen.getAllByTestId('stacktrace');
    expect(stacktraces).toHaveLength(3);
  });

  it('with stack traces should have the title in a specific format', () => {
    renderWithTheme(<JavaWithLongLines />);

    const title = screen.getByTestId('exception-stacktrace-title');
    const { exceptions } = JavaWithLongLines.args as {
      exceptions: Array<{ type: string; message: string }>;
    };
    const { type, message } = exceptions[0];
    expect(title).toHaveTextContent(`${type}: ${message}`);
  });

  it('with more than one stack trace renders cause stacktraces', () => {
    renderWithTheme(<JavaWithLongLines />);
    const causeStacktraces = screen.getAllByTestId('cause-stacktrace');
    expect(causeStacktraces).toHaveLength(2);
  });
});
