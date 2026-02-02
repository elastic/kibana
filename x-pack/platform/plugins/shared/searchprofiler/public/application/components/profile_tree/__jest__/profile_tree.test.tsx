/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { searchResponse } from './fixtures/search_response';
import type { Props } from '../profile_tree';
import { ProfileTree } from '../profile_tree';

describe('ProfileTree', () => {
  it('renders', () => {
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      data: searchResponse,
      onDataInitError: jest.fn(),
    };

    render(<ProfileTree {...props} />);

    expect(screen.getByTestId('profileTree')).toBeInTheDocument();
    // Stable UI boundary from fixture data (IndexDetails)
    expect(
      screen.getByText((_content, node) => {
        if (node?.tagName !== 'H3') return false;
        return /Index:\s+\.kibana_1/.test(node.textContent ?? '');
      })
    ).toBeInTheDocument();
  });

  it('does not throw despite bad profile data', () => {
    // For now, ignore the console.error that gets logged.
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      onDataInitError: jest.fn(),
      // Intentionally invalid runtime data to validate error handling.
      data: [{}] as unknown as Props['data'],
    };

    render(<ProfileTree {...props} />);
    expect(props.onDataInitError).toHaveBeenCalled();
  });
});
