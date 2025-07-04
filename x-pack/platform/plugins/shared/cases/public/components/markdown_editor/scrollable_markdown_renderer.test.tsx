/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';

import { ScrollableMarkdown } from '.';

const content = 'This is sample content';

describe('ScrollableMarkdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    renderWithTestingProviders(<ScrollableMarkdown content={content} />);
    expect(screen.getByTestId('scrollable-markdown')).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
