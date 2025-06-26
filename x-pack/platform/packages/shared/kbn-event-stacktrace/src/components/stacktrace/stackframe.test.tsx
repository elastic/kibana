/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { Stackframe } from '@kbn/apm-types';
import { renderWithTheme } from '../../utils/test_helpers';
import { Stackframe as StackframeComponent } from './stackframe';
import stacktracesMock from './__fixtures__/stacktraces.json';

describe('Stackframe', () => {
  it('renders without errors when has source lines', () => {
    const stackframe = stacktracesMock[0];
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} />);

    expect(screen.getByTestId('FrameHeading')).toBeInTheDocument();
  });

  it('renders Context and Variables when has source lines', () => {
    const stackframe = stacktracesMock[0];
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} />);

    expect(screen.getByTestId('stacktraceContext')).toBeInTheDocument();
    expect(screen.getByTestId('stacktraceLocalVariables')).toBeInTheDocument();
  });

  it('has isLibraryFrame=false by default when has source lines', () => {
    const stackframe = stacktracesMock[0];
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} />);

    const heading = screen.getByTestId('FrameHeading');
    expect(heading).toHaveAttribute('data-library-frame', 'false');
  });

  it('renders only FrameHeading when has no source lines', () => {
    const stackframe = { line: {} } as Stackframe;
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} />);

    expect(screen.getByTestId('FrameHeading')).toBeInTheDocument();
    expect(screen.queryByTestId('stacktraceContext')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stacktraceLocalVariables')).not.toBeInTheDocument();
  });

  it('has isLibraryFrame=false by default when has no source lines', () => {
    const stackframe = { line: {} } as Stackframe;
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} />);

    const heading = screen.getByTestId('FrameHeading');
    expect(heading).toHaveAttribute('data-library-frame', 'false');
  });

  it('respects isLibraryFrame prop', () => {
    const stackframe = { line: {} } as Stackframe;
    renderWithTheme(<StackframeComponent id="test" stackframe={stackframe} isLibraryFrame />);

    const heading = screen.getByTestId('FrameHeading');
    expect(heading).toHaveAttribute('data-library-frame', 'true');
  });
});
