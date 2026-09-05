/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { RoundInputText } from './round_input_text';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('RoundInputText', () => {
  it('renders plain text without badges', () => {
    renderWithProvider(<RoundInputText text="hello world" />);

    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('renders a command badge from serialized format', () => {
    renderWithProvider(<RoundInputText text="[/Summarize](skill://skill-1)" />);

    expect(screen.getByText('/Summarize')).toBeInTheDocument();
  });

  it('renders mixed text and command badges', () => {
    renderWithProvider(<RoundInputText text="Use [/Summarize](skill://skill-1) to do this" />);

    expect(screen.getByText('/Summarize')).toBeInTheDocument();
    expect(screen.getByText(/Use/)).toBeInTheDocument();
    expect(screen.getByText(/to do this/)).toBeInTheDocument();
  });

  it('renders empty text', () => {
    const { container } = renderWithProvider(<RoundInputText text="" />);

    expect(container).toBeInTheDocument();
  });

  it('passes through text with unknown schemes', () => {
    renderWithProvider(<RoundInputText text="[/Unknown](unknown://id-1)" />);

    expect(screen.getByText('[/Unknown](unknown://id-1)')).toBeInTheDocument();
  });

  it('renders SML badges with full type/title text', () => {
    renderWithProvider(<RoundInputText text="[@dashboard/A](sml://entry-1)" />);

    expect(screen.getByText('@dashboard/A')).toBeInTheDocument();
  });

  it('renders an image badge for image scheme links', () => {
    renderWithProvider(<RoundInputText text="[photo.png](image://photo.png)" />);

    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('renders image badge alongside plain text', () => {
    renderWithProvider(
      <RoundInputText text="See [screenshot.png](image://screenshot.png) for details" />
    );

    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText(/See/)).toBeInTheDocument();
    expect(screen.getByText(/for details/)).toBeInTheDocument();
  });

  it('decodes percent-encoded image names', () => {
    renderWithProvider(
      <RoundInputText text="[Screenshot (1).png](image://Screenshot%20%281%29.png)" />
    );

    expect(screen.getByText('Screenshot (1).png')).toBeInTheDocument();
  });
});
