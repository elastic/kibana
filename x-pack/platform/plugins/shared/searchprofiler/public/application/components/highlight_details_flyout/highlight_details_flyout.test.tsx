/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import type { Props } from '.';
import { HighlightDetailsFlyout } from '.';

describe('Highlight Details Flyout', () => {
  it('renders', () => {
    const props: Props = {
      onClose: () => {},
      shardName: '[test][test]',
      operation: {
        breakdown: [
          {
            color: 'default',
            key: 'breakdown-1',
            relative: 100,
            tip: 'tip-1',
            time: 100,
          },
          {
            color: 'default',
            key: 'breakdown-2',
            relative: 100,
            tip: 'tip-2',
            time: 100,
          },
          {
            color: 'default',
            key: 'breakdown-3',
            relative: 100,
            tip: 'tip-3',
            time: 100,
          },
        ],
        lucene: 'lucene-query',
        query_type: 'test-query-type',
        selfTime: 100,
        time: 100,
        timePercentage: '100',
        hasChildren: false,
        visible: true,
        absoluteColor: '123',
      },
      indexName: 'test-index',
    };

    render(<HighlightDetailsFlyout {...props} />);

    const flyout = screen.getByRole('dialog');
    expect(screen.getByTestId('euiFlyoutCloseButton')).toBeInTheDocument();

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Timing breakdown')).toBeInTheDocument();

    expect(within(flyout).getByText('test-index')).toBeInTheDocument();
    expect(within(flyout).getByText('[test][test]')).toBeInTheDocument();
    expect(within(flyout).getByText('test-query-type')).toBeInTheDocument();
    expect(within(flyout).getByText('lucene-query')).toBeInTheDocument();
  });
});
