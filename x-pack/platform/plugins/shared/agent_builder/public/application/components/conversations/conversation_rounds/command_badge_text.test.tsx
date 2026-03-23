/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CommandBadgeText } from './command_badge_text';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('CommandBadgeText', () => {
  it('renders plain text without badges', () => {
    renderWithProvider(<CommandBadgeText text="hello world" />);

    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('renders a badge from serialized format', () => {
    renderWithProvider(<CommandBadgeText text="[/Summarize](skill://skill-1)" />);

    expect(screen.getByText('/Summarize')).toBeInTheDocument();
  });

  it('renders mixed text and badges', () => {
    renderWithProvider(<CommandBadgeText text="Use [/Summarize](skill://skill-1) to do this" />);

    expect(screen.getByText('/Summarize')).toBeInTheDocument();
    expect(screen.getByText(/Use/)).toBeInTheDocument();
    expect(screen.getByText(/to do this/)).toBeInTheDocument();
  });

  it('renders empty text', () => {
    const { container } = renderWithProvider(<CommandBadgeText text="" />);

    expect(container).toBeInTheDocument();
  });

  it('passes through text with unknown schemes', () => {
    renderWithProvider(<CommandBadgeText text="[/Unknown](unknown://id-1)" />);

    expect(screen.getByText('[/Unknown](unknown://id-1)')).toBeInTheDocument();
  });
});
