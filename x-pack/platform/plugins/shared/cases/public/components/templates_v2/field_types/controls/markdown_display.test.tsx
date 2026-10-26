/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownDisplay } from './markdown_display';

describe('MarkdownDisplay', () => {
  it('renders authored markdown as formatted, read-only text (no input)', () => {
    render(
      <MarkdownDisplay
        name="instructions"
        type="keyword"
        control="MARKDOWN"
        metadata={{ content: '# Heading\n\nSome **bold** guidance.' }}
      />
    );

    const display = screen.getByTestId('template-field-markdown-display-instructions');
    expect(display).toBeInTheDocument();
    // Formatted (heading rendered) and non-editable (no form controls).
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
