/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { renderBoldMatches } from './render_bold_matches';

describe('renderBoldMatches', () => {
  it('returns a placeholder span when text is empty', () => {
    const { container } = render(<>{renderBoldMatches('', 'abc')}</>);
    const placeholder = container.querySelector('span[aria-hidden="true"]');
    expect(placeholder).not.toBeNull();
  });

  it('returns plain text when query is empty/whitespace', () => {
    const { getByText, container } = render(<>{renderBoldMatches('Hello world', '   ')}</>);
    expect(getByText('Hello world')).toBeInTheDocument();
    expect(container.querySelectorAll('strong')).toHaveLength(0);
  });

  it('bolds all case-insensitive matches', () => {
    const { container } = render(<>{renderBoldMatches('Abc abc aBC', 'abc')}</>);
    expect(container.querySelectorAll('strong')).toHaveLength(3);
  });

  it('does not bold anything when there are no matches', () => {
    const { getByText, container } = render(<>{renderBoldMatches('Hello world', 'zzz')}</>);
    expect(getByText('Hello world')).toBeInTheDocument();
    expect(container.querySelectorAll('strong')).toHaveLength(0);
  });
});

