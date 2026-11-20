/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';

import { ContentDiff } from './content_diff';

const renderDiff = (previous: string, current: string) =>
  render(
    <EuiProvider>
      <ContentDiff previous={previous} current={current} />
    </EuiProvider>
  );

describe('ContentDiff', () => {
  it('marks added and removed words', () => {
    renderDiff('the quick fox', 'the slow fox');

    expect(screen.getByTestId('comment-content-diff-removed')).toHaveTextContent('quick');
    expect(screen.getByTestId('comment-content-diff-added')).toHaveTextContent('slow');
    expect(screen.getByTestId('comment-content-diff')).toHaveTextContent('the quickslow fox');
  });

  it('renders no marks when the text is unchanged', () => {
    renderDiff('same text', 'same text');

    expect(screen.queryByTestId('comment-content-diff-added')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-content-diff-removed')).not.toBeInTheDocument();
  });
});
